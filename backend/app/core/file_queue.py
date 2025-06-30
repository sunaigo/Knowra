from celery import Celery
from app.core.config import config
from app.db.session import SessionLocal
from app.db.models import Document, DocumentStatus, KnowledgeBase, Model, Connection, Collection, VectorDBConfig
from loguru import logger
from app.services.oss_connection_service import get_oss_connection
from app.core.encryption import decrypt_api_key, encrypt_api_key
import json

# 创建 Celery 实例（与 worker 保持一致）
celery_app = Celery('knowra_app')
celery_app.conf.broker_url = 'redis://127.0.0.1:6379/0'
celery_app.conf.result_backend = 'redis://127.0.0.1:6379/1'


def add_file_to_queue(doc_id: int):
    """
    分发文档解析任务到 Celery worker。
    """
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc.status = DocumentStatus.PENDING
            db.commit()
            logger.info(f"[Queue] 文档ID={doc_id} 已加入 Celery 队列...")
            task_kwargs = {
                'task_id': str(doc.id),
                'file_path': doc.filepath,
                'filetype': doc.filetype,
                'chunk_size': (doc.parsing_config or {}).get('chunk_size') or 1000,
                'overlap': (doc.parsing_config or {}).get('overlap') or 100,
                'parse_offset': doc.parse_offset or 0,
                'oss_connection_id': doc.oss_connection_id,
                'oss_bucket': doc.oss_bucket,
                'kb_id': doc.kb_id,
            }
            # 查找 embedding/vdb 配置
            kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == doc.kb_id).first() if doc.kb_id else None
            if kb:
                # embedding model
                model = db.query(Model).filter(Model.id == kb.embedding_model_id).first() if kb.embedding_model_id else None
                if model:
                    conn = db.query(Connection).filter(Connection.id == model.connection_id).first() if model.connection_id else None
                    task_kwargs['embedding_params'] = {
                        'model_id': model.id,
                        'model_name': model.model_name,
                        'model_type': model.model_type,
                        'embedding_dim': model.embedding_dim,
                        'extra_config': model.extra_config,
                        'connection': {
                            'provider': conn.provider if conn else None,
                            'api_base': conn.api_base if conn else None,
                            'api_key': encrypt_api_key(conn.api_key) if conn and conn.api_key else None,
                        } if conn else None
                    }
                # vdb 配置
                collection = db.query(Collection).filter(Collection.id == kb.collection_id).first() if kb.collection_id else None
                if collection:
                    vdb = db.query(VectorDBConfig).filter(VectorDBConfig.id == collection.vdb_id).first() if collection.vdb_id else None
                    if vdb:
                        # 兼容 connection_config 为 str 或 dict
                        vdb_config = vdb.connection_config
                        if isinstance(vdb_config, str):
                            vdb_config = json.loads(vdb_config)
                        vdb_config = dict(vdb_config or {})
                        for k in vdb_config:
                            if k in ('password', 'api_key', 'secret_key') and vdb_config[k]:
                                vdb_config[k] = encrypt_api_key(vdb_config[k])
                        task_kwargs['vdb_params'] = {
                            'vdb_id': vdb.id,
                            'type': vdb.type,
                            'connection_config': vdb_config
                        }
            # 如果是 OSS 文件，查出连接信息并加密传递
            if doc.oss_connection_id and doc.oss_bucket and str(doc.filepath).startswith('oss://'):
                oss_conn = get_oss_connection(db, doc.oss_connection_id)
                if oss_conn:
                    ak = decrypt_api_key(oss_conn.access_key)
                    sk = decrypt_api_key(oss_conn.secret_key)
                    task_kwargs['oss_params'] = {
                        'endpoint': oss_conn.endpoint,
                        'access_key': encrypt_api_key(ak),
                        'secret_key': encrypt_api_key(sk),
                        'region': oss_conn.region
                    }
            celery_app.send_task('backend.worker.tasks.parse_file_task', kwargs=task_kwargs)
    finally:
        db.close()

# 队列满判断可根据业务需要保留或移除
# def is_full():
#     ... 