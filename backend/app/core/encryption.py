from cryptography.fernet import Fernet, InvalidToken
from app.core.config import config

# 确保 FERNET_KEY 环境变量已设置
if not config.FERNET_KEY:
    raise ValueError("FERNET_KEY environment variable not set. Please generate one and set it.")

fernet = Fernet(config.FERNET_KEY.encode())

def encrypt_api_key(api_key: str) -> str:
    """Encrypts an API key."""
    if not api_key:
        return ""
    return fernet.encrypt(api_key.encode()).decode()

def decrypt_api_key(encrypted_api_key: str) -> str:
    """Decrypts an API key."""
    if not encrypted_api_key:
        return ""
    try:
        return fernet.decrypt(encrypted_api_key.encode()).decode()
    except (InvalidToken, TypeError):
        # 如果解密失败（例如，它本身就是明文），直接返回原始值
        # 这有助于处理从旧数据迁移过来的未加密密钥
        return encrypted_api_key 