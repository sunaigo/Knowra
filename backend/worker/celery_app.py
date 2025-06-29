from celery import Celery
import os

# 创建Celery应用实例
app = Celery('knowra_worker')

# Celery配置
app.conf.update(
    # Redis作为消息代理和结果后端
    broker_url='redis://127.0.0.1:6379/0',
    result_backend='redis://127.0.0.1:6379/1',
    
    # 序列化配置
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # 任务路由配置
    task_routes={
        'backend.worker.tasks.*': {'queue': 'file_parsing'},
    },
    
    # Worker配置 - 针对分布式优化
    worker_prefetch_multiplier=1,  # 每个worker一次只取一个任务，确保负载均衡
    task_acks_late=True,  # 任务完成后才确认，避免任务丢失
    worker_max_tasks_per_child=100,  # 防止内存泄漏，每100个任务重启worker进程
    
    # 任务执行配置
    task_always_eager=False,  # 生产环境必须False，确保异步执行
    task_eager_propagates=True,  # 错误传播
    task_ignore_result=False,  # 保留任务结果
    result_expires=3600,  # 结果保留1小时
    
    # 重试配置
    task_acks_on_failure_or_timeout=True,
    task_reject_on_worker_lost=True,
    
    # 监控配置
    worker_send_task_events=True,
    task_send_sent_event=True,
)

# 自动发现任务模块
app.autodiscover_tasks(['backend.worker'])

if __name__ == '__main__':
    app.start() 