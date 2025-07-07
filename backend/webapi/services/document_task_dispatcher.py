from celery import Celery
from common.core.config import config
from common.db.session import SessionLocal
from common.db.models import Document, DocumentStatus, KnowledgeBase, Model, Connection, VDBCollection, VDB
from loguru import logger
from webapi.services.oss_connection_service import get_oss_connection
from common.core.encryption import decrypt_api_key, encrypt_api_key
import json
import ast
import os
from common.schemas.worker import ParseFileTaskParams, FileInfo, OSSParams, EmbeddingParams, ParseParams, VectorDBCollectionConfig

# 创建 Celery 实例（与 worker 保持一致）
celery_app = Celery('knowra_app')
celery_app.conf.broker_url = 'redis://127.0.0.1:6379/0'
celery_app.conf.result_backend = 'redis://127.0.0.1:6379/1'


def dispatch_document_parse_task(doc_id: int):
    """
    分发文档解析任务到 Celery worker。
    """
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc.status = DocumentStatus.PENDING
            db.commit()
            logger.info(f"[Dispatcher] 文档ID={doc_id} 已加入 Celery 队列...")
            # 查找 embedding/vdb 配置
            kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == doc.kb_id).first() if doc.kb_id else None
            if kb:
                # embedding model
                model = db.query(Model).filter(Model.id == kb.embedding_model_id).first() if kb.embedding_model_id else None
                if model:
                    conn = db.query(Connection).filter(Connection.id == model.connection_id).first() if model.connection_id else None
                    embedding_dim = getattr(model, 'embedding_dim', None)
                    if embedding_dim is None:
                        embedding_dim = -1
                    embedding_params = EmbeddingParams(
                        api_base=conn.api_base,
                        api_key=encrypt_api_key(conn.api_key),
                        model_name=model.model_name,
                        model_type='embedding',
                        embedding_dim=embedding_dim,
                        provider=conn.provider
                    )
                # vdb 配置
                collection = db.query(VDBCollection).filter(VDBCollection.id == kb.collection_id).first() if kb.collection_id else None
                if collection:
                    vdb = db.query(VDB).filter(VDB.id == collection.vdb_id).first() if collection.vdb_id else None
                    if vdb:
                        # 兼容 connection_config 为 str 或 dict
                        vdb_config = vdb.connection_config
                        if isinstance(vdb_config, str):
                            try:
                                vdb_config = json.loads(vdb_config)
                            except json.JSONDecodeError:
                                try:
                                    vdb_config = ast.literal_eval(vdb_config)
                                except Exception:
                                    logger.error(f"[Dispatcher] vdb.connection_config 解析失败: {vdb_config}")
                                    vdb_config = {}
                        vdb_config = dict(vdb_config or {})
                        for k in vdb_config:
                            if k in ('password', 'api_key', 'secret_key') and vdb_config[k]:
                                vdb_config[k] = encrypt_api_key(vdb_config[k])
                        vdb_params = VectorDBCollectionConfig(
                            type=vdb.type,
                            collection_name=collection.name,
                            connection_config=vdb_config
                        )
            # 如果是 OSS 文件，查出连接信息并加密传递
            oss_params = None
            if doc.oss_connection_id and doc.oss_bucket and str(doc.filepath).startswith('oss://'):
                oss_conn = get_oss_connection(db, doc.oss_connection_id)
                if oss_conn:
                    ak = decrypt_api_key(oss_conn.access_key)
                    sk = decrypt_api_key(oss_conn.secret_key)
                    oss_params = OSSParams(
                        endpoint=oss_conn.endpoint,
                        access_key=encrypt_api_key(ak),
                        secret_key=encrypt_api_key(sk),
                        region=oss_conn.region,
                        bucket=doc.oss_bucket
                    )
            # 组装解析参数
            parse_params = ParseParams(
                chunk_size=(doc.parsing_config or {}).get('chunk_size') or (kb.chunk_size if kb and hasattr(kb, 'chunk_size') else 1000),
                overlap=(doc.parsing_config or {}).get('overlap') or (kb.overlap if kb and hasattr(kb, 'overlap') else 100)
            )
            # 组装文件参数
            file_info = FileInfo(
                path=doc.filepath,
                type=doc.filetype,
                filename=os.path.basename(doc.filepath)
            )
            # 组装 DTO 参数
            params = ParseFileTaskParams(
                task_id=str(doc.id),
                kb_id=str(doc.kb_id) if doc.kb_id is not None else None,
                doc_id=str(doc.id),
                file=file_info,
                parse_params=parse_params,
                oss=oss_params,
                embedding=embedding_params,
                vdb=vdb_params,
                parse_offset=0
            )
            try:
                logger.info(f"[Celery] 准备分发任务到 worker，params={params}")
                celery_app.send_task('backend.worker.tasks.parse_file_task', args=[params.model_dump()])
                logger.info(f"[Celery] 任务已成功分发到 worker，doc_id={doc_id}")
            except Exception as e:
                logger.error(f"[Celery] 任务分发异常：{e}")
    finally:
        db.close()

# 队列满判断可根据业务需要保留或移除
# def is_full():
#     ... 