#!/bin/bash

# 读取 .env 文件中的配置（如存在）
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# 默认 conda 环境名
CONDA_ENV=${PYTHON_CONDA_ENV:-knowra-py312}

# 检查 conda 是否可用
if ! command -v conda &> /dev/null; then
  echo "conda 未安装或未加入 PATH，请先安装 Anaconda/Miniconda 并配置环境变量。"
  exit 1
fi

# 激活指定 conda 环境
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate $CONDA_ENV

# 切换到脚本所在目录的上一级（即项目根目录）
cd "$(dirname "$0")/.."

# 设置 PYTHONPATH，确保 worker 包可被正确导入
export PYTHONPATH=backend

# 启动 Celery worker
if [[ "$(uname)" == "Darwin" ]]; then
  OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES celery -A worker.celery_app worker --loglevel=info --concurrency=2
else
  celery -A worker.celery_app worker --loglevel=info --concurrency=2
fi 