from typing import List, Callable, Optional
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from celery.exceptions import TaskRevokedError

# 文本切割工具

def split_text(
    text: str,
    splitter_type: str = 'recursive',
    chunk_size: int = 500,
    chunk_overlap: int = 50,
    **kwargs
) -> List[str]:
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter, MarkdownHeaderTextSplitter
    except ImportError:
        raise ImportError('请在worker环境中安装 langchain_text_splitters')
    if splitter_type == 'markdown':
        splitter = MarkdownHeaderTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            **kwargs
        )
    else:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            **kwargs
        )
    return splitter.split_text(text)

# PDF 解析工具

def parse_pdf(file_path: str) -> str:
    try:
        from langchain_community.document_loaders import PyPDFLoader
    except ImportError:
        raise ImportError('请在worker环境中安装 langchain_community')
    loader = PyPDFLoader(file_path)
    docs = loader.load()
    text = "\n".join([doc.page_content for doc in docs])
    return text

# 支持Celery的文件解析主流程
def parse_file_with_progress(task_id: str, file_path: str, filetype: str, 
                           chunk_size: int, overlap: int, parse_offset: int = 0,
                           progress_callback: Optional[Callable] = None,
                           celery_task=None, **kwargs):
    """
    支持Celery分布式处理的文件解析主流程：
    - 支持txt/pdf文件
    - 文本切割
    - 多线程embedding（此处embedding用sleep模拟）
    - 支持断点续传、进度回调、任务撤销检查
    """
    
    def check_revoked():
        """检查任务是否被撤销"""
        if celery_task and celery_task.is_aborted():
            raise TaskRevokedError("任务已被撤销")
    
    try:
        # 1. 读取文件内容
        check_revoked()
        if progress_callback:
            progress_callback(5, 'reading_file')
            
        if filetype == 'pdf' or file_path.lower().endswith('.pdf'):
            text = parse_pdf(file_path)
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        
        # 2. 切割
        check_revoked()
        if progress_callback:
            progress_callback(10, 'splitting_text')
            
        chunks = split_text(text, chunk_size=chunk_size, chunk_overlap=overlap)
        total = len(chunks)
        
        if total == 0:
            raise ValueError("文件切割后无内容")
        
        print(f"[Worker] 任务{task_id} 切割后共{total}个chunk, 开始embedding...")
        
        # 3. 多线程embedding（模拟）
        parallel = kwargs.get('parallel', 3)
        start_offset = parse_offset or 0
        
        if progress_callback:
            progress_callback(15, 'starting_embedding', start_offset)
        
        def embed_one(args):
            i, chunk = args
            try:
                check_revoked()  # 在每个embedding任务中检查撤销状态
                
                # TODO: 调用真实embedding模型，这里用sleep模拟
                time.sleep(0.1)
                print(f"[Worker] 任务{task_id} embedding chunk {i+1}/{total}")
                return i
            except TaskRevokedError:
                print(f"[Worker] 任务{task_id} 在处理chunk {i+1}时被撤销")
                return None
        
        # 使用线程池进行并发处理
        with ThreadPoolExecutor(max_workers=parallel) as pool:
            # 只处理从断点开始的chunks
            futures = [
                pool.submit(embed_one, (i, chunk)) 
                for i, chunk in enumerate(chunks) 
                if i >= start_offset
            ]
            
            completed_chunks = []
            for fut in as_completed(futures):
                try:
                    check_revoked()  # 在主线程中也检查撤销状态
                    
                    i = fut.result()
                    if i is not None:
                        completed_chunks.append(i)
                        current_done = start_offset + len(completed_chunks)
                        progress_val = int(15 + 80 * current_done / total)  # 15-95%
                        
                        if progress_callback:
                            progress_callback(progress_val, 'processing', current_done)
                        
                        print(f"[Worker] 任务{task_id} 进度: {progress_val}%")
                        
                except TaskRevokedError:
                    print(f"[Worker] 任务{task_id} 被撤销，停止处理")
                    # 取消所有未完成的futures
                    for f in futures:
                        f.cancel()
                    raise
        
        # 4. 完成处理
        check_revoked()
        if progress_callback:
            progress_callback(95, 'finalizing')
        
        result = {
            'total_chunks': total,
            'processed_chunks': len(completed_chunks) + start_offset,
            'start_offset': start_offset,
            'file_path': file_path,
            'filetype': filetype
        }
        
        print(f"[Worker] 任务{task_id} 解析完成！")
        return result
        
    except TaskRevokedError:
        print(f"[Worker] 任务{task_id} 已被撤销")
        raise
    except Exception as e:
        print(f"[Worker] 任务{task_id} 解析失败: {e}")
        raise

# 向后兼容的原始parse_file函数
def parse_file(task_id: str, file_path: str, filetype: str, chunk_size: int, overlap: int, parse_offset: int = 0, **kwargs):
    """向后兼容的解析函数"""
    return parse_file_with_progress(
        task_id=task_id,
        file_path=file_path,
        filetype=filetype,
        chunk_size=chunk_size,
        overlap=overlap,
        parse_offset=parse_offset,
        **kwargs
    ) 