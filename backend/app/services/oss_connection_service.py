import boto3
from sqlalchemy.orm import Session
from app.db.models import OSSConnection, OSSConnectionShare
from app.schemas.oss_connection import OSSConnectionCreate, OSSConnectionUpdate, ShareOSSConnectionIn, ShareTeamBuckets
from typing import List, Optional, BinaryIO
from datetime import datetime
from app.core.encryption import encrypt_api_key, decrypt_api_key
import logging
from botocore.exceptions import BotoCoreError, ClientError

logger = logging.getLogger(__name__)

def create_oss_connection(db: Session, conn_in: OSSConnectionCreate) -> OSSConnection:
    encrypted_access_key = encrypt_api_key(conn_in.access_key.get_secret_value())
    encrypted_secret_key = encrypt_api_key(conn_in.secret_key.get_secret_value())
    db_conn = OSSConnection(
        name=conn_in.name,
        endpoint=conn_in.endpoint,
        access_key=encrypted_access_key,
        secret_key=encrypted_secret_key,
        region=conn_in.region,
        description=conn_in.description,
        team_id=conn_in.team_id,
        maintainer_id=conn_in.maintainer_id,
        status=conn_in.status,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(db_conn)
    db.commit()
    db.refresh(db_conn)
    return db_conn

def get_oss_connections(db: Session, team_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[OSSConnection]:
    if team_id:
        # 查本团队创建的和被分享的
        # 1. 本团队创建的
        q1 = db.query(OSSConnection).filter(OSSConnection.team_id == team_id)
        # 2. 被分享的（oss_connection_share.status=active 或 revoked）
        shared_ids = db.query(OSSConnectionShare.oss_connection_id).filter(
            OSSConnectionShare.team_id == team_id,
            OSSConnectionShare.status.in_(['active', 'revoked'])
        )
        q2 = db.query(OSSConnection).filter(OSSConnection.id.in_(shared_ids))
        # 合并去重
        q = q1.union(q2)
    else:
        q = db.query(OSSConnection)
    return q.offset(skip).limit(limit).all()

def get_oss_connection(db: Session, conn_id: int) -> Optional[OSSConnection]:
    return db.query(OSSConnection).filter(OSSConnection.id == conn_id).first()

def update_oss_connection(db: Session, conn_id: int, conn_in: OSSConnectionUpdate) -> Optional[OSSConnection]:
    db_conn = get_oss_connection(db, conn_id)
    if not db_conn:
        return None
    update_data = conn_in.dict(exclude_unset=True)
    if 'access_key' in update_data and update_data['access_key'] is not None:
        update_data['access_key'] = encrypt_api_key(update_data['access_key'].get_secret_value())
    else:
        update_data.pop('access_key', None)
    if 'secret_key' in update_data and update_data['secret_key'] is not None:
        update_data['secret_key'] = encrypt_api_key(update_data['secret_key'].get_secret_value())
    else:
        update_data.pop('secret_key', None)
    for field, value in update_data.items():
        setattr(db_conn, field, value)
    db_conn.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_conn)
    return db_conn

def delete_oss_connection(db: Session, conn_id: int) -> bool:
    db_conn = get_oss_connection(db, conn_id)
    if not db_conn:
        return False
    db.delete(db_conn)
    db.commit()
    return True

def test_oss_connection(endpoint: str, access_key: str, secret_key: str, region: Optional[str] = None) -> tuple[bool, str]:
    try:
        s3 = boto3.client(
            's3',
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region
        )
        s3.list_buckets()
        return True, ""
    except Exception as e:
        msg = str(e)
        # AK/SK 错误
        if (
            "SignatureDoesNotMatch" in msg or
            "InvalidAccessKeyId" in msg or
            "The request signature we calculated does not match" in msg or
            "AccessDenied" in msg or
            "Invalid secret key" in msg
        ):
            return False, "AK/SK 错误，请检查 Access Key 和 Secret Key"
        # 网络/endpoint相关错误
        if (
            "timed out" in msg or
            "Failed to establish a new connection" in msg or
            "Name or service not known" in msg or
            "Connection refused" in msg or
            "Could not connect to the endpoint URL" in msg
        ):
            return False, "连接失败，请检查 endpoint 或网络连通性"
        # 其它归为连接失败
        return False, "连接失败"

def list_buckets(endpoint: str, access_key: str, secret_key: str, region: Optional[str] = None):
    s3 = boto3.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region
    )
    response = s3.list_buckets()
    return [b['Name'] for b in response.get('Buckets', [])]

def get_buckets_by_connection(db: Session, conn_id: int):
    conn = get_oss_connection(db, conn_id)
    if not conn:
        raise ValueError('OSS连接不存在')
    access_key = decrypt_api_key(conn.access_key)
    secret_key = decrypt_api_key(conn.secret_key)
    return list_buckets(conn.endpoint, access_key, secret_key, conn.region)

def share_oss_connection(db: Session, oss_connection_id: int, share_in: ShareOSSConnectionIn):
    # 只对本次 team_buckets 里的 team_id+bucket 撤销/激活，不影响其它 bucket
    for tb in share_in.team_buckets:
        for bucket in tb.buckets:
            # 先撤销该 team_id+bucket 的 active 记录（如果有）
            db.query(OSSConnectionShare).filter_by(
                oss_connection_id=oss_connection_id,
                team_id=tb.team_id,
                bucket=bucket,
                status='active'
            ).update({OSSConnectionShare.status: 'revoked'}, synchronize_session=False)
            # 如已存在 revoked 记录则恢复为 active，否则插入新 active 记录
            share = db.query(OSSConnectionShare).filter_by(
                oss_connection_id=oss_connection_id,
                team_id=tb.team_id,
                bucket=bucket
            ).first()
            if share:
                if share.status == 'revoked':
                    share.status = 'active'
            else:
                new_share = OSSConnectionShare(
                    oss_connection_id=oss_connection_id,
                    team_id=tb.team_id,
                    bucket=bucket,
                    status='active'
                )
                db.add(new_share)
    db.commit()

def get_shared_buckets(db: Session, oss_connection_id: int, team_id: int) -> List[str]:
    # 返回该团队被授权的所有 active bucket
    shares = db.query(OSSConnectionShare).filter_by(
        oss_connection_id=oss_connection_id,
        team_id=team_id,
        status='active'
    ).all()
    return [s.bucket for s in shares if s.bucket]

def revoke_oss_share(db: Session, oss_connection_id: int, team_id: int, bucket: str = None):
    q = db.query(OSSConnectionShare).filter_by(
        oss_connection_id=oss_connection_id,
        team_id=team_id,
        status='active'
    )
    if bucket:
        q = q.filter_by(bucket=bucket)
    q.update({OSSConnectionShare.status: 'revoked'}, synchronize_session=False)
    db.commit()

class OSSUploader:
    def __init__(self, endpoint_url: str, access_key: str, secret_key: str, region: Optional[str] = None):
        self.s3 = boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region
        )

    def upload_fileobj(self, fileobj: BinaryIO, bucket: str, key: str) -> str:
        """
        上传文件对象到指定 bucket/key，返回文件的 OSS 路径（key）。
        """
        try:
            self.s3.upload_fileobj(fileobj, bucket, key)
            return key
        except (BotoCoreError, ClientError) as e:
            raise Exception(f"OSS 上传失败: {e}") 