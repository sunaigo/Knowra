from sqlalchemy.orm import Session
from app.db.models import Document, DocumentStatus
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.services.knowledge_base_service import get_kb

# 创建文档
def create_document(db: Session, kb_id: int, filename: str, filetype: str, filepath: str, uploader_id: int, parsing_config: Optional[Dict[str, Any]] = None, status: Optional[str] = None) -> Document:
    # 校验知识库是否绑定 collection
    kb = get_kb(db, kb_id)
    if not kb or not kb.collection_id:
        raise Exception("知识库未绑定 Collection，禁止上传/解析文档")
    # TODO: 后续写入向量库时，需用 kb.collection_id 查找 collection 详情
    doc = Document(
        kb_id=kb_id,
        filename=filename,
        filetype=filetype,
        filepath=filepath,
        uploader_id=uploader_id,
        upload_time=datetime.utcnow(),
        status=status or DocumentStatus.PENDING,
        meta="",
        fail_reason="",
        parsing_config=parsing_config
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

# 获取知识库下所有文档
def get_documents(db: Session, kb_id: int) -> List[Document]:
    return db.query(Document).filter(Document.kb_id == kb_id).order_by(Document.upload_time.desc()).all()

# 获取单个文档
def get_document(db: Session, doc_id: int) -> Optional[Document]:
    return db.query(Document).filter(Document.id == doc_id).first()

# 删除文档
def delete_document(db: Session, doc: Document):
    db.delete(doc)
    db.commit()

# 更新文档
def update_document(db: Session, doc: Document, data: Dict[str, Any]):
    for key, value in data.items():
        if hasattr(doc, key):
            setattr(doc, key, value)
    db.commit()
    db.refresh(doc)
    return doc 