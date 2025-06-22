from sqlalchemy.orm import Session
from app.db.models import Model
from app.schemas.model import ModelCreate, ModelUpdate
from typing import List, Optional
import json
from datetime import datetime

def create_model(db: Session, model_in: ModelCreate, maintainer_id: int) -> Model:
    extra_config_data = {
        **(model_in.extra_config or {}),
        **{k: v for k, v in dict(
            context_length=model_in.context_length,
            max_tokens=model_in.max_tokens,
            temperature=model_in.temperature,
            vision_config=model_in.vision_config
        ).items() if v is not None}
    }
    
    db_model = Model(
        model_name=model_in.model_name,
        model_type=model_in.model_type,
        connection_id=model_in.connection_id,
        embedding_dim=model_in.embedding_dim,
        is_default=model_in.is_default,
        extra_config=json.dumps(extra_config_data) if extra_config_data else None,
        status=model_in.status,
        description=model_in.description,
        maintainer_id=maintainer_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    if db_model.is_default:
        db.query(Model).update({Model.is_default: False})
        
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model

def get_models(db: Session, skip: int = 0, limit: int = 100, model_type: str = None) -> List[Model]:
    query = db.query(Model)
    if model_type:
        query = query.filter(Model.model_type == model_type)
    return query.offset(skip).limit(limit).all()

def get_model(db: Session, model_id: int) -> Optional[Model]:
    return db.query(Model).filter(Model.id == model_id).first()

def update_model(db: Session, model_id: int, model_in: ModelUpdate) -> Optional[Model]:
    db_model = get_model(db, model_id)
    if not db_model:
        return None
        
    update_data = model_in.dict(exclude_unset=True)

    # 单独处理 extra_config
    if db_model.extra_config:
        extra = json.loads(db_model.extra_config)
    else:
        extra = {}

    if 'extra_config' in update_data:
        extra.update(update_data.pop('extra_config'))
    
    # 将顶层字段合并到 extra_config
    for key in ['context_length', 'max_tokens', 'temperature', 'vision_config']:
        if key in update_data:
            extra[key] = update_data.pop(key)
            
    if extra:
        update_data['extra_config'] = json.dumps(extra)

    for field, value in update_data.items():
        setattr(db_model, field, value)
        
    db_model.updated_at = datetime.utcnow()
    
    if db_model.is_default:
        db.query(Model).filter(Model.id != model_id).update({Model.is_default: False})
        
    db.commit()
    db.refresh(db_model)
    return db_model

def delete_model(db: Session, model_id: int) -> bool:
    model = get_model(db, model_id)
    if not model:
        return False
    db.delete(model)
    db.commit()
    return True

def set_default_model(db: Session, model_id: int) -> bool:
    model = get_model(db, model_id)
    if not model:
        return False
    db.query(Model).update({Model.is_default: False})
    model.is_default = True
    db.commit()
    db.refresh(model)
    return True 