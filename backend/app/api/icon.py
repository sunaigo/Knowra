from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.core.deps import get_current_user
from app.db import models
from app.schemas.icon import SvgIconCreate, SvgIconOut
from app.schemas.response import BaseResponse
from app.services.icon_service import SvgIconService
from typing import List, Optional
import re

router = APIRouter(prefix="/icons", tags=["icons"])

SVG_NAME_PATTERN = re.compile(r'^[A-Za-z_-]+$')
SVG_MAX_SIZE = 16 * 1024  # 16KB

@router.post("/upload", response_model=BaseResponse[SvgIconOut])
def upload_svg_icon(
    icon: SvgIconCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 校验名称格式
    if not SVG_NAME_PATTERN.match(icon.name):
        raise HTTPException(status_code=400, detail="图标名只能包含英文、下划线和-，且不能为空")
    # 校验大小
    if len(icon.content.encode('utf-8')) > SVG_MAX_SIZE:
        raise HTTPException(status_code=400, detail="SVG文件不能超过16KB")
    # 校验唯一性
    if SvgIconService.get_icon_by_name(db, icon.name):
        raise HTTPException(status_code=400, detail="图标名已存在")
    # TODO: 校验与Heroicons图标名不重复（前端可先做，后端可选做）
    new_icon = SvgIconService.create_svg_icon(db, icon.name, icon.content, current_user.id)
    return BaseResponse(data=SvgIconOut.model_validate(new_icon))

@router.get("/custom", response_model=BaseResponse)
def get_svg_icons(
    only_names: Optional[bool] = False,
    with_content: Optional[bool] = False,
    names: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if only_names:
        names = SvgIconService.get_all_icon_names(db)
        return BaseResponse(data=names)
    elif with_content:
        icons = SvgIconService.get_all_icons_with_content(db)
        return BaseResponse(data=[{"name": i.name, "content": i.content} for i in icons])
    elif names:
        name_list = [n.strip() for n in names.split(",") if n.strip()]
        icons = SvgIconService.get_icons_by_names(db, name_list)
        return BaseResponse(data=[{"name": i.name, "content": i.content} for i in icons])
    else:
        try:
            icons = SvgIconService.get_all_icons_with_content(db)
        except Exception as e:
            # 如果表不存在，返回空列表，不报错
            if 'no such table' in str(e):
                icons = []
            else:
                raise
        return BaseResponse(data=[{"name": i.name} for i in icons])

@router.get("/custom/{name}")
def get_svg_icon_content(name: str, db: Session = Depends(get_db)):
    icon = SvgIconService.get_icon_by_name(db, name)
    if not icon:
        raise HTTPException(status_code=404, detail="图标不存在")
    return Response(content=icon.content, media_type="image/svg+xml") 