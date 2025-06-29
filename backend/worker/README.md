# Knowra Worker Service

分布式文件解析Worker服务，基于Celery和FastAPI构建。

## 功能特性

- 🚀 **自动启动**: Celery worker随FastAPI服务一起启动
- 📊 **实时监控**: 支持任务进度和状态查询
- ⚡ **分布式处理**: 支持多worker实例负载均衡
- 🔄 **断点续传**: 支持任务暂停、恢复和断点续传
- 🛡️ **错误处理**: 完善的异常处理和重试机制

## 前置要求

1. **Redis服务**: 确保Redis运行在`127.0.0.1:6379`
2. **Python环境**: Python 3.12+ 和所需依赖包

## 快速启动

### 方式1: 使用uvicorn（推荐）

```bash
# 从项目根目录运行
cd Knowra
uvicorn backend.worker.main:app --host 0.0.0.0 --port 8001

# 或者从worker目录运行
cd backend/worker
uvicorn main:app --host 0.0.0.0 --port 8001
```

### 方式2: 使用启动脚本

```bash
# 进入worker目录
cd backend/worker

# 运行启动脚本
python start_worker.py
```

### 方式3: 直接运行main.py

```bash
# 从项目根目录运行
cd Knowra
python -m backend.worker.main

# 或者从worker目录运行
cd backend/worker
python main.py
```

## 服务端点

启动后，服务将在 `http://localhost:8001` 提供以下API：

### 任务管理
- `POST /worker/start_task` - 启动解析任务
- `POST /worker/pause_task` - 暂停任务
- `POST /worker/resume_task` - 恢复任务
- `GET /worker/task_status` - 查询任务状态

### 健康检查
- `GET /worker/heartbeat` - Worker心跳检查
- `GET /worker/register` - Worker注册信息

### API文档
- `GET /docs` - Swagger UI文档
- `GET /redoc` - ReDoc文档

## 使用示例

### 启动解析任务

```bash
curl -X POST "http://localhost:8001/worker/start_task" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "task_123",
    "file_path": "/path/to/document.pdf",
    "kb_id": "kb_456",
    "chunk_size": 1000,
    "chunk_overlap": 200
  }'
```

### 查询任务状态

```bash
curl "http://localhost:8001/worker/task_status?task_id=task_123"
```

### 暂停任务

```bash
curl -X POST "http://localhost:8001/worker/pause_task" \
  -H "Content-Type: application/json" \
  -d '{"task_id": "task_123"}'
```

## 多实例部署

如需运行多个worker实例：

```bash
# 实例1
python start_worker.py

# 实例2（不同端口）
uvicorn backend.worker.main:app --host 0.0.0.0 --port 8002

# 实例3
uvicorn backend.worker.main:app --host 0.0.0.0 --port 8003
```

每个实例都会启动自己的Celery worker，任务会自动在实例间负载均衡。

## 监控和调试

### 查看Celery worker日志
worker日志会输出到控制台，包含任务执行状态和错误信息。

### 使用Flower监控（可选）
```bash
# 安装Flower
pip install flower

# 启动监控界面
celery -A backend.worker.celery_app flower
# 访问 http://localhost:5555
```

## 配置选项

### Celery配置
在 `celery_app.py` 中可以调整：
- Redis连接配置
- Worker并发数
- 任务路由规则
- 结果过期时间

### FastAPI配置
在 `main.py` 中可以调整：
- 服务端口
- Worker进程数
- 日志级别

## 故障排除

### Redis连接问题
```bash
# 检查Redis是否运行
redis-cli ping

# 启动Redis（如未运行）
redis-server
```

### 端口冲突
如果8001端口被占用，可以修改启动脚本中的端口号。

### 依赖问题
```bash
# 重新安装依赖
pip install -r requirements.txt
```

## 开发说明

### 项目结构
```
backend/worker/
├── main.py              # FastAPI服务入口
├── start_worker.py      # 启动脚本
├── celery_app.py        # Celery应用配置
├── tasks.py             # Celery任务定义
├── parser.py            # 文件解析核心逻辑
├── routers.py           # 路由注册
└── api/
    └── worker_api.py    # API端点实现
```

### 添加新任务类型
1. 在 `tasks.py` 中定义新的Celery任务
2. 在 `parser.py` 中实现解析逻辑
3. 在 `worker_api.py` 中添加API端点

## 许可证

本项目采用与主项目相同的许可证。 