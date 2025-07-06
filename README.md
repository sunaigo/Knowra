# Knowra

<p align="center">
  <img src="knowra.svg" alt="Knowra Logo" width="120" />
</p>

<p align="center">
  <b>Enterprise-level Knowledge Management & Retrieval System</b>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README_zh.md">Chinese</a>
</p>

<p align="center">
  <a href="https://github.com/sunaigo/Knowra/stargazers"><img src="https://img.shields.io/github/stars/sunaigo/Knowra?style=flat-square" alt="Stars"/></a>
  <a href="https://github.com/sunaigo/Knowra/issues"><img src="https://img.shields.io/github/issues/sunaigo/Knowra?style=flat-square" alt="Issues"/></a>
  <a href="#"><img src="https://img.shields.io/badge/demo-online-blue?style=flat-square" alt="Demo"/></a>
  <a href="https://hub.docker.com/r/sunaigo/knowra"><img src="https://img.shields.io/docker/pulls/sunaigo/knowra?style=flat-square" alt="Docker Pulls"/></a>
  <a href="https://github.com/sunaigo/Knowra/releases"><img src="https://img.shields.io/github/v/release/sunaigo/Knowra?style=flat-square" alt="Release"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-green?style=flat-square" alt="License"/></a>
</p>

## Project Highlights
- Designed for enterprise-level knowledge management and retrieval scenarios
- Modular architecture, easy to extend and integrate
- Supports multi-source document management and semantic search
- Fine-grained team and permission management
- Integration with mainstream vector databases and LLMs
- Modern, responsive web UI with i18n support
- Secure authentication and role-based access control
- Easy deployment with Docker and cloud-native support

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

- Web Frontend (Next.js): Provides the user interface and communicates with the backend via REST API.
- Backend API (FastAPI): Handles business logic, user management, document processing, permissions, and retrieval services.
- Database (SQLite): Stores structured data.
- Worker (Celery): Processes asynchronous tasks such as document parsing and vector generation.
- OSS (Object Storage Service): Stores large files and original documents.
- Vector Database (Chroma/Milvus/PGVector): Stores and retrieves vectorized data.
- Model Inference (OpenAI/Ollama/Xinference): Provides model inference capabilities.

---

## Getting Started

### Prerequisites
- Node.js >= 18
- Python >= 3.12
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