from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Table, Index, JSON, ForeignKey
from sqlalchemy.orm import declarative_base, relationship, foreign
from sqlalchemy.ext.hybrid import hybrid_property
from datetime import datetime

Base = declarative_base()

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

# 用户-团队关联表
# user_team = Table(
#     'user_team', Base.metadata,
#     Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
#     Column('team_id', Integer, ForeignKey('teams.id'), primary_key=True)
# )

class UserTeam(Base):
    __tablename__ = 'user_team'
    user_id = Column(Integer, primary_key=True)
    team_id = Column(Integer, primary_key=True)
    role = Column(String(50), default='member', nullable=False)

    user = relationship(
        "User",
        primaryjoin="User.id == foreign(UserTeam.user_id)",
        back_populates="team_associations"
    )
    team = relationship(
        "Team",
        primaryjoin="Team.id == foreign(UserTeam.team_id)",
        back_populates="user_associations"
    )

# 用户表
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(128), nullable=False)
    email = Column(String(120), unique=True, index=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    team_associations = relationship(
        'UserTeam',
        primaryjoin="User.id == foreign(UserTeam.user_id)",
        back_populates='user'
    )

# 团队表
class Team(Base):
    __tablename__ = 'teams'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    icon_name = Column(String(100), nullable=True, comment='图标名称')
    created_at = Column(DateTime, default=datetime.utcnow)
    user_associations = relationship(
        'UserTeam',
        primaryjoin="Team.id == foreign(UserTeam.team_id)",
        back_populates='team'
    )
    knowledge_bases = relationship(
        'KnowledgeBase',
        primaryjoin="Team.id == foreign(KnowledgeBase.team_id)",
        back_populates='team'
    )

# 知识库表
class KnowledgeBase(Base):
    __tablename__ = 'knowledge_bases'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    owner_id = Column(Integer, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    chunk_size = Column(Integer, default=1000)
    overlap = Column(Integer, default=100)
    auto_process_on_upload = Column(Boolean, default=True)
    team_id = Column(Integer, nullable=False)
    embedding_model_id = Column(Integer)
    icon_name = Column(String(100), nullable=True, comment='图标名称')
    collection_id = Column(Integer, nullable=False, comment='绑定的Collection ID')  # 新增字段，必须绑定

    # 新增：可选绑定 OSS 连接和 bucket
    oss_connection_id = Column(Integer, nullable=True, comment='绑定的OSS连接ID')
    oss_bucket = Column(String(255), nullable=True, comment='绑定的OSS bucket名称')

    owner = relationship(
        "User",
        primaryjoin="User.id == foreign(KnowledgeBase.owner_id)"
    )
    team = relationship(
        "Team",
        primaryjoin="Team.id == foreign(KnowledgeBase.team_id)",
        back_populates="knowledge_bases"
    )
    embedding_model = relationship(
        "Model",
        primaryjoin="Model.id == foreign(KnowledgeBase.embedding_model_id)"
    )

# 文档表
class Document(Base):
    __tablename__ = 'documents'
    id = Column(Integer, primary_key=True, index=True)
    kb_id = Column(Integer, index=True)
    filename = Column(String(255), nullable=False)
    filetype = Column(String(20))
    filepath = Column(String(255))
    oss_connection_id = Column(Integer, nullable=True)
    oss_bucket = Column(String(255), nullable=True)
    uploader_id = Column(Integer, index=True)
    upload_time = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String(20), default='not_started', index=True)
    meta = Column(Text)
    fail_reason = Column(Text, default="")
    progress = Column(Integer, default=0)
    parsing_config = Column(JSON, nullable=True)
    last_parsed_config = Column(JSON, nullable=True)
    parse_offset = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)

    knowledge_base = relationship(
        "KnowledgeBase",
        primaryjoin="KnowledgeBase.id == foreign(Document.kb_id)"
    )
    uploader = relationship(
        "User",
        primaryjoin="User.id == foreign(Document.uploader_id)"
    )

# 角色表
class Role(Base):
    __tablename__ = 'roles'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    # 添加 user_roles 关系
    user_roles = relationship(
        "UserRole",
        primaryjoin="Role.id == foreign(UserRole.role_id)",
        back_populates="role"
    )
    # 添加 role_permissions 关系
    role_permissions = relationship(
        "RolePermission",
        primaryjoin="Role.id == foreign(RolePermission.role_id)",
        back_populates="role"
    )

# 用户-角色关联表
class UserRole(Base):
    __tablename__ = 'user_roles'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    role_id = Column(Integer)
    
    # 添加关系定义
    user = relationship(
        "User",
        primaryjoin="User.id == foreign(UserRole.user_id)"
    )
    role = relationship(
        "Role",
        primaryjoin="Role.id == foreign(UserRole.role_id)",
        back_populates="user_roles"
    )

# 权限表
class Permission(Base):
    __tablename__ = 'permissions'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    # 添加 role_permissions 关系
    role_permissions = relationship(
        "RolePermission",
        primaryjoin="Permission.id == foreign(RolePermission.permission_id)",
        back_populates="permission"
    )

# 角色-权限关联表
class RolePermission(Base):
    __tablename__ = 'role_permissions'
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer)
    permission_id = Column(Integer)
    
    # 添加关系定义
    role = relationship(
        "Role",
        primaryjoin="Role.id == foreign(RolePermission.role_id)",
        back_populates="role_permissions"
    )
    permission = relationship(
        "Permission",
        primaryjoin="Permission.id == foreign(RolePermission.permission_id)",
        back_populates="role_permissions"
    )

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
    maintainer_id = Column(Integer, comment="维护人ID")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    maintainer = relationship(
        "User",
        primaryjoin="User.id == foreign(Connection.maintainer_id)"
    )
    # 添加 models 关系
    models = relationship(
        "Model",
        primaryjoin="Connection.id == foreign(Model.connection_id)",
        back_populates="connection"
    )

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
    connection_id = Column(Integer, nullable=True)
    model_type = Column(String(30), nullable=False)
    embedding_dim = Column(Integer)
    is_default = Column(Boolean, default=False)
    extra_config = Column(Text)
    status = Column(String(20), default='enabled')
    description = Column(Text)
    maintainer_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    connection = relationship(
        "Connection",
        primaryjoin="Connection.id == foreign(Model.connection_id)",
        back_populates="models"
    )
    maintainer = relationship(
        "User",
        primaryjoin="User.id == foreign(Model.maintainer_id)"
    )

class SvgIcon(Base):
    __tablename__ = 'svg_icons'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, comment='图标名')
    content = Column(Text, nullable=False, comment='svg内容字符串')
    uploader_id = Column(Integer, ForeignKey('users.id'), nullable=False, comment='上传者id')
    created_at = Column(DateTime, default=datetime.utcnow)

    uploader = relationship('User', primaryjoin='User.id == foreign(SvgIcon.uploader_id)')

class VectorDBConfig(Base):
    __tablename__ = 'vector_db_configs'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    type = Column(String(30), nullable=False)  # chroma/pgvector/milvus
    team_id = Column(Integer, nullable=False)
    description = Column(Text)
    connection_config = Column(JSON, nullable=False)  # 存储所有连接参数
    is_private = Column(Boolean, default=True)
    embedding_dimension = Column(Integer, default=1536)
    index_type = Column(String(30), default="hnsw")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    shares = relationship("VDBShare", primaryjoin="VectorDBConfig.id == foreign(VDBShare.vdb_id)")

class Collection(Base):
    __tablename__ = "collection"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    vdb_id = Column(Integer, nullable=False)  # 逻辑关联，无外键
    owner_id = Column(Integer, nullable=False)  # 逻辑关联，无外键
    team_id = Column(Integer, nullable=False)  # 新增字段，团队隔离
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class VDBShare(Base):
    __tablename__ = 'vdb_share'
    id = Column(Integer, primary_key=True, autoincrement=True)
    vdb_id = Column(Integer, nullable=False)
    team_id = Column(Integer, nullable=False)
    status = Column(String(20), default='active')  # active/revoked
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # 可加唯一索引 (vdb_id, team_id) 

class OSSConnection(Base):
    __tablename__ = 'oss_connections'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, comment="连接名称")
    endpoint = Column(String(255), nullable=False, comment="S3/OSS Endpoint")
    access_key = Column(String(255), nullable=False, comment="Access Key（加密存储）")
    secret_key = Column(String(255), nullable=False, comment="Secret Key（加密存储）")
    region = Column(String(100), nullable=True, comment="区域")
    description = Column(Text, comment="描述")
    team_id = Column(Integer, nullable=False, comment="所属团队ID")
    maintainer_id = Column(Integer, nullable=False, comment="添加人ID")
    status = Column(String(20), default='enabled', comment="状态")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    team = relationship(
        "Team",
        primaryjoin="Team.id == foreign(OSSConnection.team_id)"
    )
    maintainer = relationship(
        "User",
        primaryjoin="User.id == foreign(OSSConnection.maintainer_id)"
    )
    shares = relationship("OSSConnectionShare", primaryjoin="OSSConnection.id == foreign(OSSConnectionShare.oss_connection_id)")

class OSSConnectionShare(Base):
    __tablename__ = 'oss_connection_share'
    id = Column(Integer, primary_key=True, index=True)
    oss_connection_id = Column(Integer, nullable=False, index=True, comment="OSS连接ID")
    team_id = Column(Integer, nullable=False, index=True, comment="被分享团队ID")
    status = Column(String(20), default='active', comment="分享状态 active/revoked")
    bucket = Column(String, comment="被分享的bucket")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow) 