from sqlalchemy.orm import Session
from app.db.models import Model, User
from app.schemas.model import ModelCreate, ModelUpdate
from typing import List, Optional
import json
from datetime import datetime

def create_model(db: Session, model_in: ModelCreate) -> Model:
    provider = getattr(model_in, 'provider', None) or getattr(model_in, 'type', None)
    if provider in ['embedding', 'llm', 'vllm']:
        provider_map = {'embedding': 'openai', 'llm': 'ollama', 'vllm': 'xinference'}
        provider = provider_map.get(provider, 'other')
    model = Model(
        model_name=model_in.name,
        type=provider,
        api_base=model_in.api_base,
        api_key=model_in.api_key,
        model_type=model_in.model_type,
        embedding_dim=model_in.embedding_dim,
        is_default=model_in.is_default or False,
        extra_config=json.dumps({
            **(model_in.extra_config or {}),
            **{k: v for k, v in dict(
                context_length=model_in.context_length,
                max_tokens=model_in.max_tokens,
                temperature=model_in.temperature,
                vision_config=model_in.vision_config
            ).items() if v is not None}
        }) if any([
            model_in.context_length, model_in.max_tokens, model_in.temperature, model_in.vision_config, model_in.extra_config
        ]) else None,
        status=model_in.status or 'enabled',
        description=model_in.description,
        maintainer_id=model_in.maintainer_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    if model.is_default:
        db.query(Model).update({Model.is_default: False})
    db.add(model)
    db.commit()
    db.refresh(model)
    return model

def get_models(db: Session, skip: int = 0, limit: int = 100) -> List[Model]:
    return db.query(Model).offset(skip).limit(limit).all()

def get_model(db: Session, model_id: int) -> Optional[Model]:
    return db.query(Model).filter(Model.id == model_id).first()

def update_model(db: Session, model_id: int, model_in: ModelUpdate) -> Optional[Model]:
    model = get_model(db, model_id)
    if not model:
        return None
    update_data = model_in.dict(exclude_unset=True)
    provider = update_data.pop('provider', None) or update_data.pop('type', None)
    if provider:
        if provider in ['embedding', 'llm', 'vllm']:
            provider_map = {'embedding': 'openai', 'llm': 'ollama', 'vllm': 'xinference'}
            provider = provider_map.get(provider, 'other')
        update_data['type'] = provider
    extra = update_data.pop('extra_config', None) or {}
    for k in ['context_length', 'max_tokens', 'temperature', 'vision_config']:
        v = update_data.pop(k, None)
        if v is not None:
            extra[k] = v
    if extra:
        update_data['extra_config'] = json.dumps(extra)
    for field, value in update_data.items():
        setattr(model, field, value)
    model.updated_at = datetime.utcnow()
    if getattr(model, 'is_default', False):
        db.query(Model).filter(Model.id != model_id).update({Model.is_default: False})
    db.commit()
    db.refresh(model)
    return model

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

def test_model(model) -> bool:
    provider = getattr(model, 'provider', None) or getattr(model, 'type', None)
    print(f"[test_model] provider={provider}, api_base={getattr(model, 'api_base', None)}, model_type={getattr(model, 'model_type', None)}")
    try:
        if provider == 'openai' and getattr(model, 'api_key', None) and getattr(model, 'api_base', None):
            try:
                from openai import OpenAI
                client = OpenAI(api_key=model.api_key, base_url=model.api_base)
                resp = client.embeddings.create(input="test", model=getattr(model, 'model_name', None))
                print(f"[test_model] openai sdk resp: {resp}")
                return hasattr(resp, 'data') or hasattr(resp, 'embedding')
            except Exception as e:
                print(f"[test_model] openai sdk error: {e}")
                return False
        elif provider == 'ollama' and getattr(model, 'api_base', None):
            try:
                from langchain_ollama import OllamaEmbeddings
                embedder = OllamaEmbeddings(base_url=model.api_base, model=getattr(model, 'model_name', None))
                result = embedder.embed_query("test")
                print(f"[test_model] ollama sdk resp: {result}")
                return isinstance(result, list) and len(result) > 0
            except Exception as e:
                print(f"[test_model] ollama sdk error: {e}")
                return False
        elif provider == 'xinference' and getattr(model, 'api_base', None):
            try:
                from xinference_client import RESTfulClient
                client = RESTfulClient(model.api_base)
                model_obj = client.get_model(getattr(model, 'model_name', None))
                result = model_obj.create_embedding("test")
                print(f"[test_model] xinference sdk resp: {result}")
                return result is not None
            except Exception as e:
                print(f"[test_model] xinference sdk error: {e}")
                return False
        print(f"[test_model] unknown provider or missing api_base, return False")
        return False
    except Exception as e:
        print(f"[test_model] error: {e}")
        return False

def import_models(db: Session, models_data: list) -> int:
    count = 0
    for m in models_data:
        if 'provider' not in m and 'type' in m:
            m['provider'] = m['type']
        model_in = ModelCreate(**m)
        create_model(db, model_in)
        count += 1
    return count

def export_models(db: Session) -> list:
    models = get_models(db)
    result = []
    for m in models:
        d = {c.name: getattr(m, c.name) for c in m.__table__.columns}
        if d.get('extra_config'):
            try:
                d['extra_config'] = json.loads(d['extra_config'])
            except Exception:
                pass
        result.append(d)
    return result 