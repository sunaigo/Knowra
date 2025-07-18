# Knowra

<p align="center">
  <img src="knowra.svg" alt="Knowra Logo" width="120" />
</p>

<p align="center">
  <b>企业级知识管理与检索系统</b>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README_zh.md">简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/sunaigo/Knowra/stargazers"><img src="https://img.shields.io/github/stars/sunaigo/Knowra?style=flat-square" alt="Stars"/></a>
  <a href="https://github.com/sunaigo/Knowra/issues"><img src="https://img.shields.io/github/issues/sunaigo/Knowra?style=flat-square" alt="Issues"/></a>
  <a href="#"><img src="https://img.shields.io/badge/demo-在线演示-blue?style=flat-square" alt="Demo"/></a>
  <a href="https://hub.docker.com/r/sunaigo/knowra"><img src="https://img.shields.io/docker/pulls/sunaigo/knowra?style=flat-square" alt="Docker Pulls"/></a>
  <a href="https://github.com/sunaigo/Knowra/releases"><img src="https://img.shields.io/github/v/release/sunaigo/Knowra?style=flat-square" alt="Release"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-green?style=flat-square" alt="License"/></a>
</p>

<p align="center">
  <b>企业级知识管理与检索系统</b><br/>
  <a href="#主要功能">主要功能</a> | <a href="#快速开始">快速开始</a> | <a href="#架构图">架构图</a> | <a href="#常见问题">常见问题</a> | <a href="#贡献指南">贡献指南</a>
</p>

## 项目特点
- 面向企业级知识管理与检索场景设计
- 模块化架构，易于扩展与集成
- 支持多源文档管理与语义检索
- 细粒度团队与权限管理
- 集成主流向量数据库与大模型
- 现代化响应式 Web UI，支持国际化
- 安全认证与基于角色的访问控制
- 支持 Docker 部署与云原生环境

---

## 目录
- [主要功能](#主要功能)
- [技术栈](#技术栈)
- [架构图](#架构图)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [目录结构](#目录结构)
- [常见问题](#常见问题)
- [贡献指南](#贡献指南)
- [社区与支持](#社区与支持)
- [许可证](#许可证)

---

## 主要功能
- 📄 多源文档管理（支持 PDF、Markdown、TXT 等）
- 🔍 语义检索与问答
- 👥 团队与权限管理
- 🧠 模型与向量数据库集成（OpenAI、Ollama、Xinference、Chroma、Milvus 等）
- ☁️ OSS（对象存储）支持
- 🌐 国际化（中英文）
- 🖥️ 现代化 Web UI（响应式、暗黑模式）
- 🛡️ 安全认证与基于角色的访问控制
- ⚡ FastAPI 后端，Next.js 前端
- 🐳 支持 Docker 与 Docker Compose

---

## 技术栈
- **后端：** Python（FastAPI）、Celery、SQLite
- **前端：** Next.js 15、React 19、Tailwind CSS、shadcn/ui、Zustand
- **数据库：** SQLite（无外键）
- **其他：** Docker、Redis（可选）

---

## 架构图
系统架构如下：

- Web 前端（Next.js）：为用户提供交互界面，通过 REST API 与后端通信。
- 后端 API（FastAPI）：处理业务逻辑，负责用户、文档、权限、检索等服务。
- 数据库（SQLite）：存储结构化数据。
- Worker（Celery）：异步处理文档解析、向量生成等任务。
- OSS（对象存储）：用于存储大文件和文档原件。
- 向量数据库（Chroma/Milvus/PGVector）：存储和检索向量化数据。
- 模型推理（OpenAI/Ollama/Xinference）：提供模型推理能力。

---

## 快速开始

### 环境要求
- Node.js >= 18
- Python >= 3.12
- Docker（可选）

### 本地开发
1. **克隆仓库**
   ```bash
   git clone https://github.com/your-org/Knowra.git
   cd Knowra
   ```
2. **安装后端依赖**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
3. **安装前端依赖**
   ```bash
   cd ../webapp
   pnpm install
   # 或
   npm install
   ```
4. **启动服务**
   - 后端 API：`bash ../bin/start_api.sh`
   - 检索服务：`bash ../bin/start_retrieval_service.sh`
   - Worker：`bash ../bin/start_worker.sh`
   - 前端：`pnpm dev` 或 `npm run dev`
5. **访问应用**
   - 前端：http://localhost:3000
   - 后端 API：http://localhost:8000

### Docker 一键启动
```bash
docker-compose up --build
```

---

## 配置说明
- **后端配置：** `backend/conf/config.yaml`
- **数据库：** 默认 `knowra.db`（SQLite 文件）
- **环境变量：**
  - `PORT`（后端 API 端口）
  - `FRONTEND_PORT`（前端端口）
  - `OSS_*`（对象存储配置）
  - `OPENAI_API_KEY` 等
- **前端国际化：** `webapp/locales/`

---

## 目录结构
```
Knowra/
  backend/      # Python 后端（API、检索、Worker）
    common/     # 核心、数据库、schemas、工具
    core/       # 嵌入器、向量数据库
    webapi/     # API 路由与服务
    worker/     # Celery Worker 与任务
  webapp/       # Next.js 前端
    app/        # 主页面
    components/ # UI 组件
    schemas/    # TypeScript schemas
    stores/     # Zustand 状态
    lib/        # 工具函数
  bin/          # 启动脚本
  knowra.db     # SQLite 数据库文件
```

---

## 常见问题
**Q: 如何新增文档类型？**  
A: 在 `backend/worker/services/parsing_service.py` 实现解析器并注册。

**Q: 如何切换向量数据库？**  
A: 修改 `backend/conf/config.yaml` 配置并重启服务。

**Q: 如何支持更多语言？**  
A: 在 `webapp/locales/` 添加翻译文件。

---

## 贡献指南
1. Fork 本仓库并从 `main` 创建分支
2. 遵循代码规范（Python 用 Black，JS/TS 用 Prettier）
3. 如有需要请补充/更新测试
4. 提交 Pull Request 并详细描述变更内容

详细流程见 [CONTRIBUTING.md](CONTRIBUTING.md)（待补充）。

---

## 社区与支持
- 问题反馈：[GitHub Issues](https://github.com/your-org/Knowra/issues)
- 讨论区：（待补充）
- 联系方式：（待补充）

---

## 许可证
[Apache License 2.0](LICENSE) 