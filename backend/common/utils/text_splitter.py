from langchain_text_splitters import RecursiveCharacterTextSplitter, MarkdownHeaderTextSplitter
from typing import List, Dict, Any
from langchain_community.document_loaders import PyPDFLoader

# 通用文本切割工具

def split_text(
    text: str,
    splitter_type: str = 'recursive',
    chunk_size: int = 500,
    chunk_overlap: int = 50,
    **kwargs
) -> List[str]:
    """
    支持多种切割方式和参数配置
    splitter_type: 'recursive' | 'markdown' | ...
    chunk_size: 每个chunk最大长度
    chunk_overlap: chunk重叠部分
    kwargs: 其他切割器支持的参数
    """
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

def split_text_iter(
    text: str,
    splitter_type: str = 'recursive',
    chunk_size: int = 500,
    chunk_overlap: int = 50,
    **kwargs
):
    """
    生成器方式切割文本，边切边yield chunk
    """
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
    for chunk in splitter.split_text(text):
        yield chunk

# PDF 解析工具

def parse_pdf(file_path: str) -> str:
    """
    使用 langchain-community 的 PyPDFLoader 解析 PDF 文件为纯文本
    """
    loader = PyPDFLoader(file_path)
    docs = loader.load()
    text = "\n".join([doc.page_content for doc in docs])
    return text 