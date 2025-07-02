import boto3
from typing import BinaryIO, List
from botocore.exceptions import BotoCoreError, ClientError

class OSSClient:
    def __init__(self, endpoint_url: str, access_key: str, secret_key: str, region: str | None):
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

    def download_file(self, bucket: str, key: str, local_path: str):
        """
        下载 OSS 文件到本地路径。
        """
        try:
            self.s3.download_file(bucket, key, local_path)
        except (BotoCoreError, ClientError) as e:
            raise Exception(f"OSS 下载失败: {e}")

    def get_object(self, bucket: str, key: str):
        """
        获取 OSS 文件对象内容。
        """
        try:
            return self.s3.get_object(Bucket=bucket, Key=key)
        except (BotoCoreError, ClientError) as e:
            raise Exception(f"OSS 获取对象失败: {e}")

    def delete_object(self, bucket: str, key: str):
        """
        删除 OSS 文件对象。
        """
        try:
            self.s3.delete_object(Bucket=bucket, Key=key)
        except (BotoCoreError, ClientError) as e:
            raise Exception(f"OSS 删除对象失败: {e}")

    def list_buckets(self) -> List[str]:
        """
        列出所有 bucket 名称。
        """
        try:
            response = self.s3.list_buckets()
            return [b['Name'] for b in response.get('Buckets', [])]
        except (BotoCoreError, ClientError) as e:
            raise Exception(f"OSS 列举 bucket 失败: {e}") 