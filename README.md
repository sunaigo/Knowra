# Knowra

<p align="center">
  <img src="webapp/public/knowra.svg" alt="Knowra Logo" width="120" />
</p>

<p align="center">
  <b>Modern Knowledge Management & Retrieval System</b><br/>
  <a href="#features">Features</a> | <a href="#getting-started">Getting Started</a> | <a href="#architecture">Architecture</a> | <a href="#faq">FAQ</a> | <a href="#contributing">Contributing</a>
</p>

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [FAQ](#faq)
- [Contributing](#contributing)
- [Community & Support](#community--support)
- [License](#license)

---

## Features
- 📄 Multi-source document management (PDF, Markdown, TXT, etc.)
- 🔍 Semantic search & Q&A
- 👥 Team & permission management
- 🧠 Model & vector database integration (OpenAI, Ollama, Xinference, Chroma, Milvus, etc.)
- ☁️ OSS (Object Storage Service) support
- 🌐 Internationalization (English & Chinese)
- 🖥️ Modern web UI (responsive, dark mode)
- 🛡️ Secure authentication & role-based access
- ⚡ FastAPI backend, Next.js frontend
- 🐳 Docker & Docker Compose support

---

## Tech Stack
- **Backend:** Python (FastAPI), Celery, SQLite
- **Frontend:** Next.js 15, React 19, Tailwind CSS, shadcn/ui, Zustand
- **Database:** SQLite (no foreign keys)
- **Others:** Docker, Redis (optional)

---

## Architecture
The system architecture is as follows:

- Web Frontend（Next.js）：为用户提供交互界面，通过 REST API 与后端通信。
- Backend API（FastAPI）：处理业务逻辑，负责用户、文档、权限、检索等服务。
- Database（SQLite）：存储结构化数据。
- Worker（Celery）：异步处理文档解析、向量生成等任务。
- OSS（对象存储）：用于存储大文件和文档原件。
- Vector Database（Chroma/Milvus/PGVector）：存储和检索向量化数据。
- Model Inference（OpenAI/Ollama/Xinference）：提供模型推理能力。

---

## Getting Started

### Prerequisites
- Node.js >= 18
- Python >= 3.9
- Docker (optional)

### Local Development
1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/Knowra.git
   cd Knowra
   ```
2. **Install backend dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
3. **Install frontend dependencies**
   ```bash
   cd ../webapp
   pnpm install
   # or
   npm install
   ```
4. **Start services**
   - Backend API: `bash ../bin/start_api.sh`
   - Retrieval Service: `bash ../bin/start_retrieval_service.sh`
   - Worker: `bash ../bin/start_worker.sh`
   - Frontend: `pnpm dev` or `npm run dev`
5. **Access the app**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

### Using Docker
```bash
docker-compose up --build
```

---

## Configuration
- **Backend config:** `backend/conf/config.yaml`
- **Database:** SQLite file at `knowra.db` (default)
- **Environment variables:**
  - `PORT` (backend API port)
  - `FRONTEND_PORT` (frontend port)
  - `OSS_*` (object storage config)
  - `OPENAI_API_KEY`, etc.
- **Frontend i18n:** `webapp/locales/`

---

## Project Structure
```
Knowra/
  backend/      # Python backend (API, retrieval, worker)
    common/     # Core, DB, schemas, utils
    core/       # Embedders, VDB
    webapi/     # API routes, services
    worker/     # Celery worker, tasks
  webapp/       # Next.js frontend
    app/        # Main app pages
    components/ # UI components
    schemas/    # TypeScript schemas
    stores/     # Zustand stores
    lib/        # Utilities
  bin/          # Startup scripts
  knowra.db     # SQLite database file
```

---

## FAQ
**Q: How to add a new document type?**  
A: Implement a parser in `backend/worker/services/parsing_service.py` and register it.

**Q: How to switch vector database?**  
A: Change config in `backend/conf/config.yaml` and restart services.

**Q: How to enable more languages?**  
A: Add translation files in `webapp/locales/`.

---

## Contributing
1. Fork the repo & create your branch from `main`
2. Follow code style (Black for Python, Prettier for JS/TS)
3. Add/Update tests if needed
4. Submit a pull request with clear description

See [CONTRIBUTING.md](CONTRIBUTING.md) for details (to be added).

---

## Community & Support
- Issues: [GitHub Issues](https://github.com/your-org/Knowra/issues)
- Discussions: (to be added)
- Contact: (to be added)

---

## License
[Apache License 2.0](LICENSE) 