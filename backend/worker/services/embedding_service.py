import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from worker.core.exception import TaskRevokedError
from app.core.encryption import decrypt_api_key

class EmbeddingService:
    def __init__(self, progress_callback=None, celery_task=None):
        self.progress_callback = progress_callback
        self.celery_task = celery_task

    def check_revoked(self):
        # Celery 标准任务对象没有 is_aborted 方法，如需支持撤销可扩展此处
        pass

    def embed_chunks(self, task_id, chunks, start_offset=0, parallel=3, embedding_params=None, vdb_params=None):
        # 示例：如何解密和使用 embedding/vdb 参数
        if embedding_params:
            conn = embedding_params.get('connection') or {}
            api_key = decrypt_api_key(conn.get('api_key')) if conn.get('api_key') else None
            # 其它参数可直接用 embedding_params['model_name'] 等
        if vdb_params:
            vdb_config = vdb_params.get('connection_config') or {}
            for k in ('password', 'api_key', 'secret_key'):
                if k in vdb_config and vdb_config[k]:
                    vdb_config[k] = decrypt_api_key(vdb_config[k])
            # vdb_config 现在是解密后的配置
        total = len(chunks)
        completed_chunks = []
        def embed_one(args):
            i, chunk = args
            try:
                self.check_revoked()
                # TODO: 替换为真实 embedding，使用解密后的 api_key/vdb_config
                time.sleep(0.1)
                return i
            except TaskRevokedError:
                return None
        with ThreadPoolExecutor(max_workers=parallel) as pool:
            futures = [
                pool.submit(embed_one, (i, chunk))
                for i, chunk in enumerate(chunks)
                if i >= start_offset
            ]
            for fut in as_completed(futures):
                try:
                    self.check_revoked()
                    i = fut.result()
                    if i is not None:
                        completed_chunks.append(i)
                        current_done = start_offset + len(completed_chunks)
                        progress_val = int(15 + 80 * current_done / total)
                        if self.progress_callback:
                            self.progress_callback(progress_val, 'processing', current_done)
                except TaskRevokedError:
                    for f in futures:
                        f.cancel()
                    raise
        return completed_chunks 