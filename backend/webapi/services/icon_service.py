from sqlalchemy.orm import Session
from common.db import models
from typing import List, Optional
import gzip
import base64

class SvgIconService:
    @staticmethod
    def create_svg_icon(db: Session, name: str, content: str, uploader_id: int) -> models.SvgIcon:
        # gzip压缩并base64编码
        compressed = gzip.compress(content.encode('utf-8'))
        b64_content = base64.b64encode(compressed).decode('utf-8')
        icon = models.SvgIcon(name=name, content=b64_content, uploader_id=uploader_id)
        db.add(icon)
        db.commit()
        db.refresh(icon)
        return icon

    @staticmethod
    def get_icon_by_name(db: Session, name: str) -> Optional[models.SvgIcon]:
        return db.query(models.SvgIcon).filter(models.SvgIcon.name == name).first()

    @staticmethod
    def get_all_icon_names(db: Session) -> List[str]:
        return [icon.name for icon in db.query(models.SvgIcon).all()]

    @staticmethod
    def get_all_icons_with_content(db: Session) -> List[models.SvgIcon]:
        return db.query(models.SvgIcon).all()

    @staticmethod
    def get_icons_by_names(db: Session, names: List[str]) -> List[models.SvgIcon]:
        return db.query(models.SvgIcon).filter(models.SvgIcon.name.in_(names)).all() 