"""文档处理器 - 主要的任务编排器"""

import asyncio
from typing import Dict, Any, Optional, Iterator, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from loguru import logger

from common.schemas.worker import ParseFileTaskParams, ChunkMetadata, VectorDBCollectionConfig
from core.embedder.factory import EmbedderFactory
from core.vdb.factory import VectorDBFactory
from worker.services.file_manager import FileManager
from worker.services.parsing_service import ParsingService
from worker.managers.task_state_manager import TaskStateManager
from common.schemas.worker import TaskState
from worker.managers.progress_manager import ProgressManager
from worker.managers.resource_manager import ResourceManager
from worker.exceptions.worker_exceptions import (
    WorkerBaseException, ValidationException, TaskCancelledException
)
from worker.utils.worker_utils import performance_monitor, validate_task_params


class DocumentProcessor:
    """文档处理器 - 主要的任务编排器，采用依赖注入模式"""
    
    def __init__(self):
        self.resource_manager = ResourceManager()
        self.file_manager = FileManager(self.resource_manager)
        self.parsing_service = ParsingService()
        self.task_state_manager = TaskStateManager()
        self.progress_manager = ProgressManager()
        self.last_vdb = None
    
    @performance_monitor
    def process_document(self, params: ParseFileTaskParams) -> Dict[str, Any]:
        """
        处理文档的主流程
        
        Args:
            params: 任务参数
            
        Returns:
            处理结果
            
        Raises:
            WorkerBaseException: 处理失败
        """
        task_id = params.task_id
        doc_id = int(params.doc_id) if params.doc_id else None
        
        # 使用资源管理器上下文
        with self.resource_manager.managed_resources():
            try:
                # 1. 验证参数
                self._validate_params(params)
                
                # 2. 初始化任务状态
                self.task_state_manager.set_task_state(task_id, TaskState.PROCESSING)
                self.progress_manager.notify_task_start(task_id, doc_id)
                
                # 3. 文件下载
                logger.info(f"[{task_id}] 开始下载文件: {params.file.path}")
                local_file_path = self._download_file(params)
                
                # 4. 文本解析
                logger.info(f"[{task_id}] 开始解析文件: {local_file_path}")
                text = self._parse_file(params, local_file_path)
                
                # 5. 流式处理：边切块边embedding边入库
                logger.info(f"[{task_id}] 开始流式处理：分块->向量化->存储")
                total_chunks, processed_chunks = self._stream_process_chunks(params, text)
                
                # 6. 完成处理
                result = self._finalize_processing(params, local_file_path, total_chunks, processed_chunks)
                
                # 7. 更新最终状态
                self.task_state_manager.set_task_state(task_id, TaskState.PROCESSED)
                self.progress_manager.notify_task_complete(task_id, doc_id, processed_chunks, chunk_count=processed_chunks)
                
                logger.info(f"[{task_id}] 文档处理完成: {result}")
                return result
                
            except TaskCancelledException:
                logger.warning(f"[{task_id}] 任务已被取消")
                self.task_state_manager.set_task_state(task_id, TaskState.CANCELLED)
                self.progress_manager.notify_task_failed(task_id, doc_id, "任务被取消", chunk_count=0, cancelled=True)
                raise
                
            except Exception as e:
                logger.error(f"[{task_id}] 文档处理失败: {e}")
                self.task_state_manager.set_task_state(task_id, TaskState.FAILED, {"error": str(e)})
                self.progress_manager.notify_task_failed(task_id, doc_id, str(e), chunk_count=0, cancelled=False)
                raise WorkerBaseException(f"文档处理失败: {e}")
    
    def _validate_params(self, params: ParseFileTaskParams) -> None:
        """验证任务参数"""
        # 基础参数验证
        if not validate_task_params(params.model_dump()):
            raise ValidationException("任务参数验证失败")
        
        # 文件类型验证
        if not self.parsing_service.is_type_supported(params.file.type):
            raise ValidationException(f"不支持的文件类型: {params.file.type}")
        
        # 分块参数验证
        if not self.parsing_service.validate_chunk_params(
            params.parse_params.chunk_size,
            params.parse_params.overlap
        ):
            raise ValidationException("分块参数无效")
        
        logger.debug(f"[{params.task_id}] 参数验证通过")
    
    def _download_file(self, params: ParseFileTaskParams) -> str:
        """下载文件"""
        try:
            # 检查任务是否被取消
            self.task_state_manager.check_task_cancellation(params.task_id)
            
            # 准备OSS参数
            oss_params = params.oss.model_dump() if params.oss else None
            
            # 下载文件
            local_file_path = self.file_manager.download_file(params.file.path, oss_params)
            
            logger.info(f"[{params.task_id}] 文件下载完成: {local_file_path}")
            return local_file_path
            
        except Exception as e:
            logger.error(f"[{params.task_id}] 文件下载失败: {e}")
            raise
    
    def _parse_file(self, params: ParseFileTaskParams, local_file_path: str) -> str:
        """解析文件"""
        try:
            # 检查任务是否被取消
            self.task_state_manager.check_task_cancellation(params.task_id)
            
            # 解析文件
            text = self.parsing_service.parse_file(local_file_path, params.file.type)
            
            # 获取文本统计信息
            text_stats = self.parsing_service.get_text_stats(text)
            logger.info(f"[{params.task_id}] 文本解析完成: {text_stats}")
            
            return text
            
        except Exception as e:
            logger.error(f"[{params.task_id}] 文本解析失败: {e}")
            raise
    
    def _stream_process_chunks(self, params: ParseFileTaskParams, text: str) -> tuple:
        """
        流式处理分块：边切块边embedding边入库
        
        Args:
            params: 任务参数
            text: 解析后的文本
            
        Returns:
            (总分块数, 已处理分块数)
        """
        try:
            self.task_state_manager.check_task_cancellation(params.task_id)
            embedder = EmbedderFactory.create(params.embedding.model_dump())
            vdb_config = VectorDBCollectionConfig(
                collection_name=params.vdb.collection_name,
                type=params.vdb.type,
                connection_config=params.vdb.connection_config,
                embedding_dimension=params.vdb.embedding_dimension,
                index_type=params.vdb.index_type or "hnsw"
            )
            vdb = VectorDBFactory.create_vector_db(vdb_config, embedder)
            self.last_vdb = vdb
            if not vdb.is_connected:
                asyncio.run(vdb.connect())
            self._delete_existing_chunks(int(params.doc_id) if params.doc_id else 0, vdb)
            estimated_chunks = self.parsing_service.estimate_chunk_count(
                text, 
                params.parse_params.chunk_size, 
                params.parse_params.overlap
            )
            logger.info(f"[{params.task_id}] 估算分块数: {estimated_chunks}")
            doc_id = int(params.doc_id) if params.doc_id else None
            if doc_id is not None:
                self.progress_manager.send_progress_callback(doc_id, "processing", current_offset=0, chunk_count=estimated_chunks)
            chunk_iterator = self.parsing_service.chunk_text(
                text,
                params.file.type,
                params.parse_params.chunk_size,
                params.parse_params.overlap
            )
            total_chunks, processed_chunks = self._process_chunks_streaming(
                params, chunk_iterator, embedder, vdb, estimated_chunks, doc_id
            )
            logger.info(f"[{params.task_id}] 流式处理完成: {processed_chunks}/{total_chunks}")
            return total_chunks, processed_chunks
        except Exception as e:
            logger.error(f"[{params.task_id}] 流式处理失败: {e}")
            raise
    
    def _process_chunks_streaming(
        self, 
        params: ParseFileTaskParams, 
        chunk_iterator: Iterator[Tuple[int, str]], 
        embedder, 
        vdb, 
        estimated_chunks: int,
        doc_id: int
    ) -> tuple:
        total_chunks = 0
        processed_chunks = 0
        start_offset = params.parse_offset or 0
        parallel_workers = params.parallel or 3
        chunk_batch = []
        batch_size = parallel_workers * 2
        with ThreadPoolExecutor(max_workers=parallel_workers) as executor:
            futures = []
            try:
                for chunk_idx, chunk_text in chunk_iterator:
                    self.task_state_manager.check_task_cancellation(params.task_id)
                    total_chunks += 1
                    if chunk_idx < start_offset:
                        continue
                    metadata = self._create_chunk_metadata(params, chunk_idx, chunk_text)
                    future = executor.submit(
                        self._process_single_chunk,
                        chunk_text, metadata, embedder, vdb
                    )
                    futures.append((chunk_idx, future))
                    if len(futures) >= batch_size:
                        processed_count = self._process_batch_futures(
                            futures[:parallel_workers], 
                            params.task_id,
                            processed_chunks,
                            estimated_chunks,
                            doc_id
                        )
                        processed_chunks += processed_count
                        futures = futures[parallel_workers:]
                if futures:
                    processed_count = self._process_batch_futures(
                        futures, 
                        params.task_id,
                        processed_chunks,
                        estimated_chunks,
                        doc_id
                    )
                    processed_chunks += processed_count
            except Exception as e:
                logger.error(f"[{params.task_id}] 流式处理异常: {e}")
                for idx, future in futures:
                    try:
                        future.result(timeout=1.0)
                    except:
                        pass
                raise
        return total_chunks, processed_chunks
    
    def _process_batch_futures(
        self, 
        futures: list, 
        task_id: str, 
        current_processed: int,
        total_chunks: int,
        doc_id: int
    ) -> int:
        completed = 0
        for idx, future in futures:
            try:
                self.task_state_manager.check_task_cancellation(task_id)
                future.result()
                completed += 1
                # 直接上报进度
                self.progress_manager.update_progress(task_id, current_processed + completed, total_chunks)
                if doc_id is not None:
                    self.progress_manager.send_progress_callback(doc_id, "processing", current_offset=current_processed + completed, chunk_count=total_chunks)
            except TaskCancelledException:
                raise
            except Exception as e:
                import traceback
                logger.error(f"[分块处理异常] 任务ID={task_id}, idx={idx}, 错误={e}\n堆栈={traceback.format_exc()}")
        return completed
    
    def _process_single_chunk(self, chunk_text: str, metadata: dict, embedder, vdb) -> None:
        """处理单个分块"""
        try:
            vdb.add_texts([chunk_text], metadatas=[metadata])
        except Exception as e:
            import traceback
            logger.error(f"[分块入库异常] chunk元数据={metadata}, 错误={e}\n堆栈={traceback.format_exc()}")
            raise
    
    def _delete_existing_chunks(self, doc_id: int, vdb) -> None:
        """删除历史分块（只依赖doc_id和vdb）"""
        try:
            delete_where = {"doc_id": int(doc_id)}
            vdb._client.delete(where=delete_where)
            logger.info(f"已删除历史分块: doc_id={doc_id}")
        except Exception as e:
            logger.warning(f"删除历史分块失败: doc_id={doc_id}, error={e}")
    
    def _create_chunk_metadata(self, params: ParseFileTaskParams, idx: int, chunk_text: str) -> dict:
        """创建分块元数据"""
        filename = params.file.filename or params.file.path
        
        metadata = ChunkMetadata(
            doc_id=int(params.doc_id) if params.doc_id else 0,
            chunk_id=idx,
            kb_id=params.kb_id,
            filetype=params.file.type,
            length=len(chunk_text),
            filename=filename,
            upload_time=params.upload_time,
            uploader_id=params.uploader_id,
            chunk_offset=None,
            source="oss" if str(params.file.path).startswith("oss://") else "local",
            chunk_size=params.parse_params.chunk_size,
            overlap=params.parse_params.overlap,
            embedding_model_name=params.embedding.model_name,
            embedding_dim=params.embedding.embedding_dim
        )
        
        return metadata.model_dump()
    
    def _finalize_processing(
        self, 
        params: ParseFileTaskParams, 
        local_file_path: str, 
        total_chunks: int, 
        processed_chunks: int
    ) -> Dict[str, Any]:
        """完成处理，返回结果"""
        if processed_chunks == 0:
            raise WorkerBaseException("文件切割后无内容")
        
        result = {
            'total_chunks': total_chunks,
            'processed_chunks': processed_chunks + (params.parse_offset or 0),
            'start_offset': params.parse_offset or 0,
            'file_path': local_file_path,
            'filetype': params.file.type
        }
        
        return result