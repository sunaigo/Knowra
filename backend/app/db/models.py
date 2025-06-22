from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, Table, Index, JSON
from sqlalchemy.orm import relationship, declarative_base, Mapped
from sqlalchemy.ext.hybrid import hybrid_property
from datetime import datetime

Base = declarative_base()

# 用户-团队多对多关系表
user_team = Table(
    'user_team', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('team_id', Integer, ForeignKey('teams.id')),
    Column('role', String(20), default='member')
)

# 团队-知识库多对多关系表
team_kb = Table(
    'team_kb', Base.metadata,
    Column('team_id', Integer, ForeignKey('teams.id')),
    Column('kb_id', Integer, ForeignKey('knowledge_bases.id'))
)

# 业务常量
class DocumentStatus:
    NOT_STARTED = 'not_started'
    PENDING = 'pending'
    PROCESSING = 'processing'
    PROCESSED = 'processed'
    FAILED = 'failed'
    PAUSED = 'paused'

class UserRoleConst:
    ADMIN = 'admin'
    USER = 'user'

class PermissionConst:
    READ = 'read'
    WRITE = 'write'
    DELETE = 'delete'

# 用户表
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(128), nullable=False)
    email = Column(String(120), unique=True, index=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    teams = relationship('Team', secondary=user_team, back_populates='users')
    created_at = Column(DateTime, default=datetime.utcnow)

# 团队表
class Team(Base):
    __tablename__ = 'teams'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    users = relationship('User', secondary=user_team, back_populates='teams')
    knowledge_bases = relationship('KnowledgeBase', secondary=team_kb, back_populates='teams')
    created_at = Column(DateTime, default=datetime.utcnow)

# 知识库表
class KnowledgeBase(Base):
    __tablename__ = 'knowledge_bases'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey('users.id'))
    owner = relationship('User')
    teams = relationship('Team', secondary=team_kb, back_populates='knowledge_bases')
    documents = relationship('Document', back_populates='knowledge_base')
    created_at = Column(DateTime, default=datetime.utcnow)
    chunk_size = Column(Integer, default=1000)  # 默认切割块大小
    overlap = Column(Integer, default=100)      # 默认重叠
    auto_process_on_upload = Column(Boolean, default=True)  # 上传时自动处理
    team_id = Column(Integer, ForeignKey('teams.id'), nullable=True)
    embedding_model_id = Column(Integer, ForeignKey('models.id'), nullable=True)  # 新增字段
    embedding_model = relationship('Model')  # 新增关系

# 文档表
class Document(Base):
    __tablename__ = 'documents'
    id = Column(Integer, primary_key=True, index=True)
    kb_id = Column(Integer, ForeignKey('knowledge_bases.id'), index=True)
    filename = Column(String(255), nullable=False)
    filetype = Column(String(20))
    filepath = Column(String(255))
    uploader_id = Column(Integer, ForeignKey('users.id'), index=True)
    uploader = relationship('User')
    knowledge_base = relationship('KnowledgeBase', back_populates='documents')
    upload_time = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String(20), default='not_started', index=True)  # not_started, pending, processing, processed, failed
    meta = Column(Text)  # 预留元数据字段
    fail_reason = Column(Text, default="")  # 失败原因
    progress = Column(Integer, default=0)  # 0~100，处理进度百分比
    parsing_config = Column(JSON, nullable=True)  # 文档独立的解析参数，JSON格式
    last_parsed_config = Column(JSON, nullable=True)  # 上次成功解析时使用的参数，JSON格式
    parse_offset = Column(Integer, default=0)   # 断点续解析的最小未完成chunk_id
    chunk_count = Column(Integer, default=0)      # 文档分块总数

# 角色表
class Role(Base):
    __tablename__ = 'roles'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)

# 用户-角色关联表
class UserRole(Base):
    __tablename__ = 'user_roles'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    role_id = Column(Integer, ForeignKey('roles.id'))

# 权限表
class Permission(Base):
    __tablename__ = 'permissions'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)

# 角色-权限关联表
class RolePermission(Base):
    __tablename__ = 'role_permissions'
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey('roles.id'))
    permission_id = Column(Integer, ForeignKey('permissions.id'))

# 联合索引（如常用复合查询）
Index('idx_documents_kb_status', Document.kb_id, Document.status)

# 连接（模型提供商）表
class Connection(Base):
    __tablename__ = 'connections'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, comment="连接名称")
    provider = Column(String(30), nullable=False, comment="模型提供商")
    api_base = Column(String(255), nullable=False, comment="API 基础地址")
    api_key = Column(String(255), nullable=True, comment="API 密钥")
    status = Column(String(20), default='enabled', comment="状态")
    description = Column(Text, comment="描述")
    maintainer_id = Column(Integer, ForeignKey('users.id'), comment="维护人ID")
    maintainer = relationship('User')
    models = relationship('Model', back_populates='connection')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @hybrid_property
    def has_api_key(self):
        return self.api_key is not None and self.api_key != ''

    @has_api_key.expression
    def has_api_key(cls):
        return cls.api_key.isnot(None) & (cls.api_key != '')

class Model(Base):
    __tablename__ = 'models'
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False)  # 模型名称
    connection_id = Column(Integer, ForeignKey('connections.id'), nullable=True)
    connection = relationship('Connection', back_populates='models')
    model_type = Column(String(30), nullable=False)  # 新增：大语言模型/向量模型/视觉模型
    embedding_dim = Column(Integer)  # 向量维度
    is_default = Column(Boolean, default=False)  # 是否为默认
    extra_config = Column(Text)  # JSON 字符串，扩展参数
    status = Column(String(20), default='enabled')  # enabled/disabled
    description = Column(Text)
    maintainer_id = Column(Integer, ForeignKey('users.id'))  # 维护人
    maintainer = relationship('User')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow) 