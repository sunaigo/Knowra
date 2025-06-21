from sqlalchemy.orm import Session
from app.db.models import Document, DocumentStatus
from typing import Optional, List, Dict, Any
from datetime import datetime

# 创建文档
def create_document(db: Session, kb_id: int, filename: str, filetype: str, filepath: str, uploader_id: int, parsing_config: Optional[Dict[str, Any]] = None, status: Optional[str] = None) -> Document:
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