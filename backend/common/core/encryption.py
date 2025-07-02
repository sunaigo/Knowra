from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import os, base64
from common.core.config import config

# 确保 AES_KEY 环境变量已设置，且为32字节
if not config.AES_KEY or len(config.AES_KEY.encode()) < 32:
    raise ValueError("AES_KEY (AES-256密钥)环境变量未设置或长度不足32字节。请生成32字节密钥并设置。");

AES_KEY = config.AES_KEY.encode()[:32]  # 取前32字节，确保AES-256
BLOCK_SIZE = 128  # AES block size in bits

backend = default_backend()

# 加密

def encrypt_api_key(api_key: str) -> str:
    """
    使用AES-256-CBC加密api_key，PKCS7填充，自动生成IV，返回base64(iv+密文)
    """
    if not api_key:
        return ""
    iv = os.urandom(16)
    padder = padding.PKCS7(BLOCK_SIZE).padder()
    padded_data = padder.update(api_key.encode()) + padder.finalize()
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=backend)
    encryptor = cipher.encryptor()
    ct = encryptor.update(padded_data) + encryptor.finalize()
    # 返回 base64(iv + ct)
    return base64.b64encode(iv + ct).decode()

# 解密

def decrypt_api_key(encrypted_api_key: str) -> str:
    """
    解密AES-256-CBC加密的api_key，自动识别iv，兼容解密失败时返回原文
    """
    if not encrypted_api_key:
        return ""
    try:
        raw = base64.b64decode(encrypted_api_key)
        iv = raw[:16]
        ct = raw[16:]
        cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=backend)
        decryptor = cipher.decryptor()
        padded_data = decryptor.update(ct) + decryptor.finalize()
        unpadder = padding.PKCS7(BLOCK_SIZE).unpadder()
        data = unpadder.update(padded_data) + unpadder.finalize()
        return data.decode()
    except Exception:
        # 解密失败时直接返回原文（兼容旧数据）
        return encrypted_api_key 