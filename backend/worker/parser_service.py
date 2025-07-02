from common.utils.text_splitter import parse_pdf
from common.utils.text_splitter import split_text, split_text_iter
from common.utils.oss_client import OSSClient
import tempfile
import os
from common.core.encryption import decrypt_api_key
from loguru import logger
from concurrent.futures import ThreadPoolExecutor, as_completed
from core.embedder.factory import EmbedderFactory
from core.vdb.factory import VectorDBFactory
from common.schemas.worker import ParseFileTaskParams, ChunkMetadata, VectorDBCollectionConfig
import redis

class FileParserService:
    def __init__(self, progress_callback=None):
        self.progress_callback = progress_callback

    def check_revoked(self, filename=None):
        # 检查redis中是否存在doc_parse:{filename}对应的key
        if filename is None:
            return False
        redis_key = f'doc_parse:{filename}'
        r = redis.StrictRedis(host='127.0.0.1', port=6379, db=0)
        if not r.exists(redis_key):
            # 终止时删除redis key
            r.delete(redis_key)
            logger.info(f"[ParserService] 任务终止，已删除redis key: {redis_key}")
            return True
        return False

    def ensure_local_file(self, file_path, oss_bucket=None, oss_params=None):
        if file_path.startswith('oss://'):
            if not oss_params:
                raise ValueError('缺少 OSS 连接参数')
            oss_key = file_path.replace(f'oss://{oss_bucket}/', '')
            tmp_dir = os.environ.get('TMP_UPLOAD_DIR', './uploads/tmp')
            os.makedirs(tmp_dir, exist_ok=True)
            tmp_file = tempfile.NamedTemporaryFile(delete=False, dir=tmp_dir, suffix=os.path.splitext(oss_key)[-1])
            ak = decrypt_api_key(oss_params['access_key'])
            sk = decrypt_api_key(oss_params['secret_key'])
            uploader = OSSClient(
                endpoint_url=oss_params['endpoint'],
                access_key=ak,
                secret_key=sk,
                region=oss_params.get('region')
            )
            uploader.download_file(oss_bucket, oss_key, tmp_file.name)
            return tmp_file.name
        return file_path

    def parse_text(self, filetype, local_file_path):
        if filetype == 'pdf' or (local_file_path and local_file_path.lower().endswith('.pdf')):
            return parse_pdf(local_file_path)
        elif filetype in ['txt', 'md']:
            with open(local_file_path, 'r', encoding='utf-8') as f:
                return f.read()
        else:
            raise ValueError(f"不支持的文件类型: {filetype}")

    def chunk_iter(self, text, filetype, chunk_size, overlap):
        return split_text_iter(text, splitter_type=filetype, chunk_size=chunk_size, chunk_overlap=overlap)

    def embed_and_store(self, chunks, embedder, vdb, make_metadata, doc_id, start_offset, parallel=3, filename=None):
        if not vdb.is_connected:
            import asyncio
            asyncio.run(vdb.connect())
        completed = 0
        total = 0
        redis_key = f'doc_parse:{filename}' if filename else None
        r = redis.StrictRedis(host='127.0.0.1', port=6379, db=0)
        with ThreadPoolExecutor(max_workers=parallel) as pool:
            futures = []
            for idx, chunk in chunks:
                # 检查redis key，若不存在则终止
                if redis_key and not r.exists(redis_key):
                    logger.warning(f"[ParserService] 检测到redis key已被删除，任务终止，当前offset={completed}")
                    return total, completed
                total += 1
                if idx < start_offset:
                    continue
                meta = make_metadata(idx, chunk)
                fut = pool.submit(lambda c, m: (embedder.embed_documents([c])[0], c, m), chunk, meta)
                futures.append((idx, fut))
                if len(futures) >= parallel * 2:
                    done, futures = futures[:1], futures[1:]
                    for i, f in done:
                        # 再次检查redis key
                        if redis_key and not r.exists(redis_key):
                            logger.warning(f"[ParserService] 检测到redis key已被删除，任务终止，当前offset={completed}")
                            return total, completed
                        emb, c, m = f.result()
                        vdb.add_texts([c], metadatas=[m])
                        completed += 1
                        if completed % 10 == 0 and self.progress_callback:
                            self.progress_callback(doc_id, 'processing', current_offset=completed)
            for i, f in futures:
                if redis_key and not r.exists(redis_key):
                    logger.warning(f"[ParserService] 检测到redis key已被删除，任务终止，当前offset={completed}")
                    return total, completed
                emb, c, m = f.result()
                vdb.add_texts([c], metadatas=[m])
                completed += 1
                if completed % 10 == 0 and self.progress_callback:
                    self.progress_callback(doc_id, 'processing', current_offset=completed)
        return total, completed

    def parse(self, args: ParseFileTaskParams):
        filename = args.file.path  # oss文件名
        oss_bucket = args.oss.bucket if args.oss else None
        start_offset = args.parse_offset or 0
        parallel = args.parallel or 3
        if self.progress_callback:
            self.progress_callback(args.doc_id, 'processing')
        try:
            local_file_path = self.ensure_local_file(args.file.path, oss_bucket, args.oss.model_dump() if args.oss else None)
            text = self.parse_text(args.file.type, local_file_path)
            embedder = EmbedderFactory.create(args.embedding.model_dump())
            vdb_config = VectorDBCollectionConfig(
                collection_name=args.vdb.collection_name,
                type=args.vdb.type,
                connection_config=args.vdb.connection_config,
                embedding_dimension=args.vdb.embedding_dimension,
                index_type=args.vdb.index_type or "hnsw"
            )
            vdb = VectorDBFactory.create_vector_db(vdb_config, embedder)
            import asyncio
            asyncio.run(vdb.connect())
            delete_where = {"filename": args.file.filename}
            vdb._client.delete(where=delete_where)
            logger.info(f"[ParserService] 已删除 doc_id={args.doc_id} 的历史分块")
            def make_metadata(idx, chunk):
                return ChunkMetadata(
                    doc_id=int(args.doc_id),
                    chunk_id=idx,
                    kb_id=args.kb_id,
                    filetype=args.file.type,
                    length=len(chunk),
                    filename=filename,
                    upload_time=args.upload_time,
                    uploader_id=args.uploader_id,
                    chunk_offset=None,
                    source="oss" if str(args.file.path).startswith("oss://") else "local",
                    chunk_size=args.parse_params.chunk_size,
                    overlap=args.parse_params.overlap,
                    embedding_model_name=args.embedding.model_name,
                    embedding_dim=args.embedding.embedding_dim
                ).model_dump()
            chunks = ((idx, chunk) for idx, chunk in enumerate(self.chunk_iter(text, args.file.type, args.parse_params.chunk_size, args.parse_params.overlap)))
            total, completed = self.embed_and_store(chunks, embedder, vdb, make_metadata, args.doc_id, start_offset, parallel, filename=filename)
            logger.info(f"[ParserService] 切割+embedding+入库完成, 总分块: {total}, 已处理: {completed}")
            if completed == 0:
                logger.error("[ParserService] 文件切割后无内容, 终止解析")
                raise ValueError("文件切割后无内容")
            if self.progress_callback:
                self.progress_callback(args.doc_id, 'processed')
            result = {
                'total_chunks': total,
                'processed_chunks': completed + start_offset,
                'start_offset': start_offset,
                'file_path': local_file_path,
                'filetype': args.file.type
            }
            logger.info(f"[ParserService] 解析任务最终结果: {result}")
            return result
        except Exception as e:
            logger.error(f"[ParserService] 解析异常: {e}")
            raise 