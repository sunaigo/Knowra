from sqlalchemy.orm import Session
from app.db.models import Permission

def create_permission(db: Session, name: str, description: str = ""):
    perm = Permission(name=name, description=description)
    db.add(perm)
    db.commit()
    db.refresh(perm)
    return perm

def get_permissions(db: Session):
    return db.query(Permission).all()

def delete_permission(db: Session, perm_id: int):
    perm = db.query(Permission).filter(Permission.id == perm_id).first()
    if perm:
        db.delete(perm)
        db.commit()
        return True
    return False 