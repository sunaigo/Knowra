from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_ollama import OllamaEmbeddings
from typing import List, Dict, Any
import os
from app.core.config import config

# 初始化Chroma向量库

def get_embedding_model():
    """根据全局配置获取embedding模型实例"""
    embed_config = config.embedding
    if embed_config['default'] == 'openai':
        return OpenAIEmbeddings()
    elif embed_config['default'] == 'ollama':
        return OllamaEmbeddings(
            base_url=embed_config['ollama']['url'],
            model=embed_config['ollama']['model']
        )
    raise NotImplementedError(f"不支持的 embedding model type: {embed_config['default']}")

def get_chroma_collection(collection_name: str, embedding_function, persist_dir: str = None):
    if persist_dir is None:
        # 使用项目根目录下的 vector_store 作为持久化存储的基础路径
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        persist_dir = os.path.join(base_dir, "vector_store")

    # 完整的持久化路径应包含 collection_name
    collection_persist_dir = os.path.join(persist_dir, collection_name)
    os.makedirs(collection_persist_dir, exist_ok=True)
    
    db = Chroma(
        collection_name=collection_name,
        persist_directory=collection_persist_dir,
        embedding_function=embedding_function
    )
    return db

# 向量化并入库

def add_texts_to_chroma(
    texts: List[str],
    metadatas: List[Dict[str, Any]],
    collection_name: str = 'default',
    model_type: str = 'openai',
    persist_dir: str = './chroma_data',
    ollama_url: str = 'http://10.0.0.2:11434',
    ollama_model: str = 'dengcao/Qwen3-Embedding-0.6B:Q8_0',
    **kwargs
):
    if model_type == 'openai':
        embedder = OpenAIEmbeddings()
    elif model_type == 'ollama':
        embedder = OllamaEmbeddings(
            base_url=ollama_url,
            model=ollama_model
        )
    else:
        raise NotImplementedError('仅支持openai或ollama模型，如需扩展请实现其他embedding')
    db = get_chroma_collection(collection_name, persist_dir, embedding_function=embedder)
    db.add_texts(texts, metadatas=metadatas)
    db.persist()
    return db

# 检索

def search_chroma(
    query: str,
    collection_name: str = 'default',
    model_type: str = 'openai',
    persist_dir: str = './chroma_data',
    ollama_url: str = 'http://10.0.0.2:11434',
    ollama_model: str = 'dengcao/Qwen3-Embedding-0.6B:Q8_0',
    top_k: int = 5,
    **kwargs
):
    if model_type == 'openai':
        embedder = OpenAIEmbeddings()
    elif model_type == 'ollama':
        embedder = OllamaEmbeddings(
            base_url=ollama_url,
            model=ollama_model
        )
    else:
        raise NotImplementedError('仅支持openai或ollama模型，如需扩展请实现其他embedding')
    db = get_chroma_collection(collection_name, persist_dir, embedding_function=embedder)
    return db.similarity_search(query, k=top_k) 