[Switch to English Version](README.md)

# Knowra：企业级 AI 知识库管理平台

## 简介

Knowra 是一款现代化的开源知识库管理平台，旨在帮助团队和企业高效地管理、检索和利用其内部知识。它深度集成了大语言模型（LLM）能力，通过先进的检索增强生成（RAG）技术，将非结构化文档转化为可对话、可查询的智能知识库。

## 技术栈

本项目采用前后端分离架构：

**后端 (Backend)**
- **语言**: Python
- **Web 框架**: [FastAPI](https://fastapi.tiangolo.com/) - 一个现代化、高性能的 Python Web 框架。
- **数据库 ORM**: [SQLAlchemy](https://www.sqlalchemy.org/) - 用于与关系型数据库进行交互。
- **向量数据库**: [ChromaDB](https://www.trychroma.com/) - 用于存储和高效检索向量嵌入。
- **AI 框架**: [LangChain](https://www.langchain.com/) - 用于构建和编排由大语言模型驱动的应用程序。
- **AI 模型**: 兼容 [OpenAI](https://openai.com/) API 的各类模型。
- **身份验证**: JWT, Passlib, BCrypt。

**前端 (Frontend)**
- **语言**: TypeScript
- **框架**: [Next.js](https://nextjs.org/) (React) - 用于构建服务端渲染和静态页面的 React 框架。
- **UI 组件库**: [shadcn/ui](https://ui.shadcn.com/) - 基于 Radix UI 和 Tailwind CSS 的可组合、可访问的组件集合。
- **样式**: [Tailwind CSS](https://tailwindcss.com/) - 一个功能类优先的 CSS 框架。
- **状态管理 & 数据请求**: React Hooks, SWR/React Query (Next.js 内置)。
- **国际化**: i18next。

## 核心功能

- **多知识库管理**：创建和管理多个独立的知识库，实现数据隔离。
- **智能文档处理**：支持上传多种格式的文档（如 PDF, TXT, Markdown），并自动进行文本分割和向量化。
- **RAG 问答**：基于上传的文档内容，通过大语言模型进行智能问答。
- **用户与团队管理**：支持多用户和团队协作。
- **模型管理**：灵活配置和切换使用的大语言模型。

## 更新日志
### 2025-06-21
- **文档处理暂停与恢复功能**
  - 现在可以暂停正在处理中的文档解析任务。
  - 对于已暂停或处理失败的文档，可以选择从上次的断点处继续，或从头开始重新解析。
  - 处理过程中会实时显示解析进度（已完成分块数 / 总分块数）。
- **重要修复与优化**
  - 修复了导致恢复解析时断点始终为0的严重并发问题。
  - 修复了Next.js服务端与客户端渲染内容不匹配（Hydration Mismatch）的错误，该错误由国际化（i18n）翻译键使用不当引起。
  - 统一了文档列表页和文档详情页的操作体验，均支持暂停、恢复与重新解析。
  - 优化了多处UI/UX细节，提升了操作的便利性和界面的清晰度。

## 快速启动

### 1. 使用 Docker (推荐)

这是最简单的启动方式，请确保您的系统中已安装 Docker 和 Docker Compose。

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/Knowra.git
cd Knowra

# 2. 启动服务
# 该命令会自动构建并启动前端、后端和数据库服务。
docker-compose up --build
```
服务启动后，请访问 `http://localhost:3000` 查看前端页面。

### 2. 本地开发环境启动

#### 后端

```bash
# 1. 进入后端目录
cd backend

# 2. (推荐) 创建并激活虚拟环境
python -m venv venv
source venv/bin/activate  # on Windows, use `venv\Scripts\activate`

# 3. 安装依赖
pip install -r requirements.txt

# 4. 启动后端服务
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 前端

```bash
# 1. 进入前端目录
cd webapp

# 2. 安装依赖 (推荐使用 pnpm)
pnpm install

# 3. 启动前端开发服务
pnpm run dev
```
前端服务默认运行在 `http://localhost:3000`。

## 贡献

欢迎任何形式的贡献！如果您有任何问题或建议，请随时提交 Issue 或 Pull Request。
