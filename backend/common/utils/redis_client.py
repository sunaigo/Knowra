import redis
import threading

class RedisPool:
    _instance = None
    _lock = threading.Lock()

    @classmethod
    def get_pool(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = redis.ConnectionPool(
                        host='127.0.0.1',
                        port=6379,
                        db=0,
                        max_connections=20  # 可根据实际情况调整
                    )
        return cls._instance

def get_redis():
    """
    获取全局Redis连接实例，线程安全单例连接池，默认127.0.0.1:6379, db=0。
    后续如需支持配置可扩展。
    """
    return redis.StrictRedis(connection_pool=RedisPool.get_pool())

# 实用工具方法

def set_key(key, value, ex=None):
    """设置key，支持可选过期时间ex（秒）"""
    r = get_redis()
    return r.set(key, value, ex=ex)

def get_key(key):
    """获取key的值，返回bytes或None"""
    r = get_redis()
    return r.get(key)

def delete_key(key):
    """删除key，返回删除的数量"""
    r = get_redis()
    return r.delete(key)

def exists_key(key):
    """判断key是否存在，返回True/False"""
    r = get_redis()
    return r.exists(key) == 1 