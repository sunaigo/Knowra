import logging
from sqlalchemy.orm import Session
from app.db.models import Connection
from app.schemas.connection import ConnectionCreate, ConnectionUpdate, ConnectionTest, ConnectionConfig
from typing import List, Optional
from datetime import datetime
from app.core.encryption import encrypt_api_key, decrypt_api_key
from pydantic import SecretStr
from ollama import Client as OllamaClient
from openai import OpenAI
from xinference_client import client as Xinference
import traceback

logger = logging.getLogger(__name__)

def create_connection(db: Session, conn_in: ConnectionCreate, maintainer_id: int) -> Connection:
    encrypted_api_key = encrypt_api_key(conn_in.api_key) if conn_in.api_key else None
    
    db_conn = Connection(
        name=conn_in.name,
        provider=conn_in.provider,
        api_base=conn_in.api_base,
        description=conn_in.description,
        api_key=encrypted_api_key,
        maintainer_id=maintainer_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(db_conn)
    db.commit()
    db.refresh(db_conn)
    return db_conn

def get_connections(db: Session, skip: int = 0, limit: int = 100) -> List[Connection]:
    return db.query(Connection).offset(skip).limit(limit).all()

def get_connection(db: Session, conn_id: int) -> Optional[Connection]:
    return db.query(Connection).filter(Connection.id == conn_id).first()

def update_connection(db: Session, conn_id: int, conn_in: ConnectionUpdate) -> Optional[Connection]:
    db_conn = get_connection(db, conn_id)
    if not db_conn:
        return None
    
    update_data = conn_in.dict(exclude_unset=True)
    
    if 'api_key' in update_data and update_data['api_key'] is not None:
        update_data['api_key'] = encrypt_api_key(update_data['api_key'])
    else:
        update_data.pop('api_key', None)

    for field, value in update_data.items():
        setattr(db_conn, field, value)
        
    db_conn.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_conn)
    return db_conn

def delete_connection(db: Session, conn_id: int) -> bool:
    db_conn = get_connection(db, conn_id)
    if not db_conn:
        return False
    db.delete(db_conn)
    db.commit()
    return True

def _test_connection_logic(provider: str, config: ConnectionConfig, model_name: Optional[str] = None):
    """
    Performs the actual connection test.
    Raises an exception if the test fails.
    """
    try:
        if provider == 'ollama':
            client = OllamaClient(host=config.base_url)
            if model_name:
                client.show(model_name)
            else:
                client.list()
        elif provider == 'openai':
            if not config.api_key:
                raise ValueError("OpenAI provider requires an API key.")
            client = OpenAI(api_key=config.api_key, base_url=config.base_url)
            if model_name:
                client.models.retrieve(model_name)
            else:
                client.models.list()
        elif provider == 'xinference':
            client = Xinference(config.base_url)
            if model_name:
                models = client.list_models()
                if not any(model_name in model_info['model_name'] for model_info in models.values()):
                    raise ValueError(f"Model '{model_name}' not found in Xinference.")
            else:
                client.list_models()
        else:
            raise ValueError(f"Unsupported provider: {provider}")
    except Exception as e:
        logger.error(f"Connection test failed: {traceback.format_exc()}")
        raise e

def test_connection(conn_in: ConnectionTest):
    """
    Tests a connection. Raises an exception if the test fails.
    This function is used by the connection form.
    """
    _test_connection_logic(
        provider=conn_in.provider,
        config=conn_in.config,
        model_name=conn_in.model_name
    )

def test_connection_by_id(db: Session, connection_id: int, model_name: str = None):
    """
    Tests a connection by its ID.
    Raises an exception if the connection does not exist or the test fails.
    """
    connection = get_connection(db, connection_id)
    if not connection:
        raise ValueError("连接不存在")
    
    decrypted_api_key = decrypt_api_key(connection.api_key) if connection.api_key else None

    config = ConnectionConfig(
        base_url=connection.api_base,
        api_key=decrypted_api_key
    )
    
    _test_connection_logic(
        provider=connection.provider,
        config=config,
        model_name=model_name
    ) 