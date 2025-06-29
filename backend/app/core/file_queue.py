import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from app.core.config import config
from app.db.session import SessionLocal
from app.db.models import Document, DocumentStatus, KnowledgeBase, Model, Connection, Collection, VectorDBConfig
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
import traceback
from loguru import logger
from app.langchain_utils.text_splitter import split_text, parse_pdf
from app.langchain_utils.vector_store import add_texts_to_chroma

class DocumentProcessor:
    """
    文档处理器，负责文档切割、embedding等具体处理流程。
    """
    def __init__(self, doc: Document):
        self.doc = doc

    def _get_kb_and_chunks(self):
        db = SessionLocal()
        try:
            # 找到文档所属的知识库，并预加载 embedding_model 及其 connection
            kb = db.query(KnowledgeBase).options(
                joinedload(KnowledgeBase.embedding_model).joinedload(Model.connection)
            ).filter_by(id=self.doc.kb_id).first()
            # 新增：获取知识库绑定的 collection 及其 VDB 配置
            collection = None
            collection_name = None
            vdb_config = None
            if kb and kb.collection_id:
                collection = db.query(Collection).filter(Collection.id == kb.collection_id).first()
                if collection:
                    collection_name = collection.name
                    vdb_config = db.query(VectorDBConfig).filter(VectorDBConfig.id == collection.vdb_id).first()
                    logger.debug(f"[Collection] DocID={self.doc.id} 绑定Collection: id={collection.id}, name={collection.name}, vdb_id={collection.vdb_id}")
                    if vdb_config:
                        logger.debug(f"[VDB] DocID={self.doc.id} VDB配置: id={vdb_config.id}, name={vdb_config.name}, type={vdb_config.type}")
                    else:
                        logger.warning(f"[VDB] DocID={self.doc.id} collection绑定的VDB配置未找到！vdb_id={collection.vdb_id}")
                else:
                    logger.warning(f"[Collection] DocID={self.doc.id} collection_id={kb.collection_id} 在数据库中未找到！")
            else:
                logger.warning(f"[Collection] DocID={self.doc.id} 所属知识库未绑定collection！kb_id={self.doc.kb_id}")
        finally:
            db.close()
        
        # 优先使用文档自身的解析参数，否则使用知识库的参数
        doc_config = self.doc.parsing_config or {}
        kb_config = {"chunk_size": kb.chunk_size, "overlap": kb.overlap} if kb else {}
        
        chunk_size = doc_config.get("chunk_size") or kb_config.get("chunk_size") or 1000
        overlap = doc_config.get("overlap") or kb_config.get("overlap") or 100

        # 支持 PDF 文件解析
        if self.doc.filetype == 'pdf' or self.doc.filename.lower().endswith('.pdf'):
            text = parse_pdf(self.doc.filepath)
        else:
            with open(self.doc.filepath, 'r', encoding='utf-8') as f:
                text = f.read()
        chunks = split_text(text, chunk_size=chunk_size, chunk_overlap=overlap)
        metadatas = [{"doc_id": self.doc.id, "kb_id": self.doc.kb_id, "chunk_id": i, "length": len(chunks[i])} for i in range(len(chunks))]
        return kb, collection_name, vdb_config, chunks, metadatas

    def _should_pause(self):
        db = SessionLocal()
        try:
            doc = db.query(Document).filter(Document.id == self.doc.id).first()
            return doc and doc.status == DocumentStatus.PAUSED
        finally:
            db.close()

    def _handle_pause(self, db_chroma, completed_chunks, start_offset):
        db = SessionLocal()
        try:
            doc = db.query(Document).filter(Document.id == self.doc.id).first()
            
            # 统一数据源：无论何时暂停，都根据当前实际完成的块数计算最终的安全断点
            final_offset = start_offset + len(completed_chunks)
            logger.info(f"[Pause] DocID={self.doc.id}: Pause triggered. Saving offset: {final_offset}")
            doc.parse_offset = final_offset
            doc.status = DocumentStatus.PAUSED
            db.commit()

            # 关键：同时更新当前实例的 doc 对象状态，以保证数据同步
            self.doc.parse_offset = final_offset
            self.doc.status = DocumentStatus.PAUSED
            
            # 清理时，删除所有大于等于新断点的块，确保丢弃所有乱序完成的数据
            where_filter = {
                "$and": [
                    {"doc_id": {"$eq": self.doc.id}},
                    {"chunk_id": {"$gte": final_offset}}
                ]
            }
            db_chroma.delete(where=where_filter)
            logger.info(f"[Pause] 文档ID={self.doc.id} 已暂停，断点parse_offset={final_offset}")

        finally:
            db.close()

    def process(self):
        try:
            # 关键修复：在处理开始时，立即从数据库重新获取最新的文档状态
            # 以确保拿到最新的 parse_offset，避免使用旧的、过时的状态。
            db = SessionLocal()
            try:
                re_fetched_doc = db.query(Document).filter(Document.id == self.doc.id).first()
                if re_fetched_doc:
                    self.doc = re_fetched_doc
            finally:
                db.close()
            
            logger.info(f"[Process] DocID={self.doc.id}: Starting processing. Initial offset from DB is {self.doc.parse_offset or 0}.")

            kb, collection_name, vdb_config, chunks, metadatas = self._get_kb_and_chunks()
            if not collection_name or not vdb_config:
                logger.error(f"[Collection] DocID={self.doc.id} 未能获取有效的Collection名称或VDB配置，终止解析！")
                raise ValueError("知识库未绑定有效的 Collection 或 VDB 配置，无法进行解析")
            logger.info(f"[Collection] DocID={self.doc.id} 解析将写入Collection: {collection_name} (VDB: {vdb_config.name})")
            total = len(chunks)
            db = SessionLocal()
            try:
                doc_to_update = db.query(Document).filter(Document.id == self.doc.id).first()
                if doc_to_update:
                    doc_to_update.chunk_count = total
                    db.commit()
            finally:
                db.close()

            # 支持 PDF 文件
            if not self.doc.filepath or (not self.doc.filename.lower().endswith('.txt') and not self.doc.filename.lower().endswith('.pdf')):
                db = SessionLocal()
                try:
                    doc = db.query(Document).filter(Document.id == self.doc.id).first()
                    doc.status = DocumentStatus.FAILED
                    doc.fail_reason = '仅支持txt/pdf文档自动切割入库'
                    doc.progress = 100
                    db.commit()
                finally:
                    db.close()
                return
            if total == 0:
                db = SessionLocal()
                try:
                    doc = db.query(Document).filter(Document.id == self.doc.id).first()
                    doc.status = DocumentStatus.FAILED
                    doc.fail_reason = '切割后无内容'
                    doc.progress = 100
                    db.commit()
                finally:
                    db.close()
                return
            
            # 使用VDB工厂创建正确的向量数据库连接
            from app.db.vdb.factory import VectorDBFactory
            from app.db.vdb.types import VectorDBConfig as VDBPydanticConfig
            from app.core.config import config as global_config
            import json
            
            embedder = None
            embedding_model = kb.embedding_model

            # 优先使用知识库指定的模型
            if embedding_model and embedding_model.connection:
                logger.info(f"DocID={self.doc.id}: 使用知识库 specific 模型: {embedding_model.model_name} from {embedding_model.connection.provider}")
                provider = embedding_model.connection.provider
                if provider == 'ollama':
                    from langchain_ollama import OllamaEmbeddings
                    embedder = OllamaEmbeddings(
                        base_url=embedding_model.connection.api_base,
                        model=embedding_model.model_name
                    )
                elif provider == 'openai':
                    from langchain_openai import OpenAIEmbeddings
                    embedder = OpenAIEmbeddings(
                        model=embedding_model.model_name,
                        api_key=embedding_model.connection.api_key,
                        base_url=embedding_model.connection.api_base or None
                    )
                # 可在此处添加对其他 provider (如 xinference) 的支持
            
            # 如果没有指定模型，则使用全局默认配置作为 fallback
            if not embedder:
                logger.info(f"DocID={self.doc.id}: 知识库未指定模型，回退到全局默认模型: {global_config.embedding['default']}")
                if global_config.embedding['default'] == 'openai':
                    from langchain_openai import OpenAIEmbeddings
                    embedder = OpenAIEmbeddings()
                elif global_config.embedding['default'] == 'ollama':
                    from langchain_ollama import OllamaEmbeddings
                    embedder = OllamaEmbeddings(
                        base_url=global_config.embedding['ollama']['url'],
                        model=global_config.embedding['ollama']['model']
                    )

            if not embedder:
                raise ValueError("无法初始化 Embedding 模型，请检查知识库或全局配置。")

            # 创建VDB配置对象并使用工厂创建向量数据库实例
            vdb_pydantic_config = VDBPydanticConfig(
                name=vdb_config.name,
                type=vdb_config.type,
                team_id=vdb_config.team_id,
                description=vdb_config.description,
                connection_config=json.loads(vdb_config.connection_config),
                is_private=vdb_config.is_private,
                embedding_dimension=vdb_config.embedding_dimension,
                index_type=vdb_config.index_type,
                created_at=vdb_config.created_at,
                updated_at=vdb_config.updated_at
            )
            
            # 使用VDB工厂创建向量数据库实例
            vdb_instance = VectorDBFactory.create_vector_db(vdb_pydantic_config, embedder)
            
            # 连接到向量数据库
            import asyncio
            connected = asyncio.run(vdb_instance.connect())
            if not connected:
                raise ValueError(f"无法连接到向量数据库: {vdb_config.name}")
            
            logger.info(f"[VDB] DocID={self.doc.id} 成功连接到向量数据库: {vdb_config.name} (类型: {vdb_config.type})")

            # 使用真正的向量数据库进行操作，而不是本地ChromaDB
            db_chroma = vdb_instance._client  # 获取底层的向量数据库客户端
            logger.debug(f"[Collection] DocID={self.doc.id} 向量数据库客户端已初始化: {collection_name}")

            start_offset = self.doc.parse_offset or 0
            # 仅当从头开始处理时，才删除所有旧数据块
            if start_offset == 0:
                logger.info(f"[Embedding] DocID={self.doc.id}: Deleting all old chunks before processing from scratch in collection {collection_name} ...")
                db_chroma.delete(where={"doc_id": self.doc.id})
            else:
                logger.info(f"[Embedding] DocID={self.doc.id}: Resuming from offset {start_offset} in collection {collection_name} .")
            
            logger.info(f"[Embedding] DocID={self.doc.id}，共{total}个chunk，即将开始embedding...")
            parallel = global_config.embedding['parallel']
            stop_flag = threading.Event()

            def embed_one(args):
                i, chunk, meta = args
                if self._should_pause():
                    stop_flag.set()
                    return None
                db_chroma.add_texts([chunk], metadatas=[meta])
                return i
            with ThreadPoolExecutor(max_workers=parallel) as pool:
                futures = [pool.submit(embed_one, (i, chunk, meta)) for i, (chunk, meta) in enumerate(zip(chunks, metadatas)) if i >= start_offset]
                completed_chunks = []
                for fut in as_completed(futures):
                    i = fut.result()
                    if i is not None:
                        completed_chunks.append(i)
                        
                        current_done = start_offset + len(completed_chunks)
                        progress_val = int(100 * current_done / total)
                        logger.info(f"[Embedding] DocID={self.doc.id}: Chunk {current_done}/{total} processed. Progress: {progress_val}%")

                        db = SessionLocal()
                        try:
                            doc = db.query(Document).filter(Document.id == self.doc.id).first()
                            doc.progress = progress_val
                            doc.parse_offset = current_done
                            db.commit()
                        finally:
                            db.close()
                    if stop_flag.is_set():
                        self._handle_pause(db_chroma, completed_chunks, start_offset)
                        return

            db = SessionLocal()
            try:
                # 重新获取最新的文档和知识库对象，以确保拿到最新的配置
                doc = db.query(Document).filter(Document.id == self.doc.id).first()
                kb = doc.knowledge_base

                # 确定本次解析实际使用的配置
                effective_config = {
                    "chunk_size": doc.parsing_config.get("chunk_size") if doc.parsing_config else kb.chunk_size,
                    "overlap": doc.parsing_config.get("overlap") if doc.parsing_config else kb.overlap,
                }

                # 更新文档状态和最终配置
                doc.status = DocumentStatus.PROCESSED
                doc.fail_reason = ''
                doc.progress = 100
                doc.parse_offset = 0
                doc.last_parsed_config = effective_config
                doc.chunk_count = total
                db.commit()
            finally:
                db.close()
        except Exception as e:
            db = SessionLocal()
            try:
                doc = db.query(Document).filter(Document.id == self.doc.id).first()
                doc.status = DocumentStatus.FAILED
                doc.fail_reason = str(e) + '\n' + traceback.format_exc()
                doc.progress = 100
                db.commit()
            finally:
                db.close()

class FileProcessQueue:
    """
    文件处理队列，负责调度文档处理任务。
    """
    def __init__(self):
        self.max_workers = config._cfg['file_process']['max_workers']
        self.poll_interval = config._cfg['file_process']['poll_interval']
        self.executor = ThreadPoolExecutor(max_workers=self.max_workers)
        self.running = False
        self.lock = threading.Lock()

    def start(self):
        if not self.running:
            self.running = True
            threading.Thread(target=self._poll, daemon=True).start()

    def _poll(self):
        while self.running:
            try:
                db = SessionLocal()
                docs = db.query(Document).filter(Document.status.in_([DocumentStatus.PENDING, DocumentStatus.PROCESSING])).order_by(Document.upload_time.asc()).all()
                for doc in docs:
                    if doc.status == DocumentStatus.PENDING:
                        logger.info(f"[Queue] 文档ID={doc.id} 已进入处理队列，状态=pending")
                        self.executor.submit(self._process_doc, doc.id)
                        doc.status = DocumentStatus.PROCESSING
                        db.commit()
                db.close()
            except Exception as e:
                logger.error(f'文件队列轮询异常: {e}')
            time.sleep(self.poll_interval)

    def _process_doc(self, doc_id):
        db: Session = SessionLocal()
        try:
            doc = db.query(Document).filter(Document.id == doc_id).first()
            if not doc:
                return
            processor = DocumentProcessor(doc)
            processor.process()
        finally:
            db.close()

file_queue = FileProcessQueue()

def add_file_to_queue(doc_id: int):
    """
    将文档加入处理队列（等待后台轮询）。
    """
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc.status = DocumentStatus.PENDING
            db.commit()
            logger.info(f"[Queue] 文档ID={doc_id} 已加入处理队列，等待处理...")
    finally:
        db.close()

def is_full():
    """
    判断处理队列是否已满。
    """
    return file_queue.executor._work_queue.qsize() >= file_queue.max_workers

file_queue.is_full = is_full 