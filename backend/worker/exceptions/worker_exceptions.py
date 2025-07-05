"""Worker模块异常定义"""


class WorkerBaseException(Exception):
    """Worker基础异常"""
    
    def __init__(self, message: str, error_code: str = None, details: dict = None):
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)


class FileHandleException(WorkerBaseException):
    """文件处理异常"""
    pass


class FileDownloadException(FileHandleException):
    """文件下载异常"""
    pass


class FileCleanupException(FileHandleException):
    """文件清理异常"""
    pass


class ParseException(WorkerBaseException):
    """解析异常"""
    pass


class TextParseException(ParseException):
    """文本解析异常"""
    pass


class ChunkException(ParseException):
    """文本分块异常"""
    pass


class TaskStateException(WorkerBaseException):
    """任务状态异常"""
    pass


class TaskCancelledException(TaskStateException):
    """任务已取消异常"""
    pass


class TaskTimeoutException(TaskStateException):
    """任务超时异常"""
    pass


class ResourceException(WorkerBaseException):
    """资源管理异常"""
    pass


class ConfigurationException(WorkerBaseException):
    """配置异常"""
    pass


class ValidationException(WorkerBaseException):
    """参数验证异常"""
    pass 