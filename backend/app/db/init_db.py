import sys
import os
from .models import Base, User
from .session import engine, SessionLocal
from app.core.security import get_password_hash
from sqlalchemy import create_engine, inspect

def add_auto_process_column():
    # This path is hardcoded, which is not ideal but we'll leave it for now.
    engine = create_engine('sqlite:///./knowra.db')
    insp = inspect(engine)
    if 'knowledge_bases' in insp.get_table_names():
        with engine.connect() as conn:
            columns = [col['name'] for col in insp.get_columns('knowledge_bases')]
            if 'auto_process_on_upload' not in columns:
                # In a real app, this should be handled by Alembic.
                # The BOOLEAN DEFAULT 1 is for SQLite.
                conn.execute('ALTER TABLE knowledge_bases ADD COLUMN auto_process_on_upload BOOLEAN DEFAULT 1')

def init_db():
    # add_auto_process_column() # This is legacy migration code, disabling it.
    
    # Create all tables according to the models
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == 'admin').first():
            admin = User(
                username='admin',
                hashed_password=get_password_hash('123456'),
                email='admin@local.com',
                is_active=True,
                is_superuser=True
            )
            db.add(admin)
            db.commit()
            print('Default admin user "admin" with password "123456" has been created.')
        else:
            print('Default admin user already exists.')
    finally:
        db.close()

if __name__ == "__main__":
    print("Initializing the database...")
    init_db()
    print("Database initialization complete.") 