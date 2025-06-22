[Switch to Chinese Version (中文版)](README_zh.md)

# Knowra: Enterprise-Grade AI Knowledge Base Management Platform

## Introduction

Knowra is a modern, open-source knowledge base management platform designed to help teams and enterprises efficiently manage, retrieve, and utilize their internal knowledge. It is deeply integrated with Large Language Model (LLM) capabilities, transforming unstructured documents into conversational and queryable intelligent knowledge bases through advanced Retrieval-Augmented Generation (RAG) technology.

## Tech Stack

This project uses a separated frontend and backend architecture:

**Backend**
- **Language**: Python
- **Web Framework**: [FastAPI](https://fastapi.tiangolo.com/) - A modern, high-performance Python web framework.
- **Database ORM**: [SQLAlchemy](https://www.sqlalchemy.org/) - For interacting with relational databases.
- **Vector Database**: [ChromaDB](https://www.trychroma.com/) - For storing and efficiently retrieving vector embeddings.
- **AI Framework**: [LangChain](https://www.langchain.com/) - For building and orchestrating applications powered by large language models.
- **AI Models**: Compatible with various models that follow the [OpenAI](https://openai.com/) API standard.
- **Authentication**: JWT, Passlib, BCrypt.

**Frontend**
- **Language**: TypeScript
- **Framework**: [Next.js](https://nextjs.org/) (React) - A React framework for building server-side rendered and static web applications.
- **UI Component Library**: [shadcn/ui](https://ui.shadcn.com/) - A collection of composable and accessible components built on Radix UI and Tailwind CSS.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework.
- **State Management & Data Fetching**: React Hooks, SWR/React Query (built into Next.js).
- **Internationalization**: i18next.

## Core Features

- **Multi-Knowledge-Base Management**: Create and manage multiple independent knowledge bases for data isolation.
- **Intelligent Document Processing**: Supports uploading various document formats (e.g., PDF, TXT, Markdown) with automatic text splitting and vectorization.
- **RAG-based Q&A**: Perform intelligent question-answering based on the content of uploaded documents.
- **User and Team Management**: Supports multi-user and team collaboration.
- **Model Management**: Flexibly configure and switch between different large language models.

## Update Log
### 2025-06-22
- **Knowledge Base Feature Enhancement**
  - **Model Binding**: Ability to select and bind an existing Embedding model when creating/editing a knowledge base.
  - **Dynamic Model Loading**: During document processing, the system now intelligently uses the model bound to the knowledge base for vectorization, instead of a global model. It falls back to the system default if no model is bound.
- **Frontend Refactoring & Optimization**
  - **Component Reuse**: Refactored the "New/Edit Knowledge Base" pages into a reusable `KnowledgeBaseForm` component, improving code maintainability.
  - **Interaction Feedback**: Introduced the `sonner` component to provide instant toast notifications for form submissions, enhancing user experience.
- **Bug Fixes**
  - Fixed an issue where the frontend failed to fetch the embedding model list due to requests lacking authentication tokens.
  - Fixed a runtime `AttributeError` in the backend caused by improper use of `joinedload`.
- **Enhanced Connection Management Security**
  - **Encrypted Storage**: API keys for connections are now encrypted in the database using Fernet, with the key managed via a `.env` file.
  - **Secure Transmission**: The backend API no longer sends sensitive API keys to the frontend, preventing potential exposure.
- **Improved Connection Form UX**
  - Enhanced the "Test Connection" button with clear loading, success, and failure states (icons and text).
  - Specific error messages from the backend are now displayed directly in the UI, aiding in debugging.
  - Implemented a safety mechanism: users must successfully test a new connection before it can be saved, and cannot save a connection that has failed testing.
- **Bug Fixes & Refactoring**
  - Fixed various i18n translation key issues.
  - Resolved backend startup errors related to environment variable loading.
  - Refactored the Model and Connection forms into reusable components for better maintainability.

### 2025-06-21
- **Document Processing Pause and Resume Functionality**
  - You can now pause ongoing document parsing tasks.
  - For paused or failed documents, you can choose to resume from the last breakpoint or restart from the beginning.
  - Real-time progress tracking (processed chunks / total chunks) is displayed during processing.
- **Key Fixes and Optimizations**
  - Fixed a critical concurrency issue that caused the resume breakpoint to always be 0.
  - Resolved a Next.js Hydration Mismatch error caused by incorrect usage of internationalization (i18n) keys.
  - Unified the user experience on the document list page and document detail page, both now supporting pause, resume, and re-parsing.
  - Optimized various UI/UX details to improve usability and clarity.

## Quick Start

### 1. Using Docker (Recommended)

This is the easiest way to get started. Please ensure you have Docker and Docker Compose installed on your system.

```bash
# 1. Clone the project
git clone https://github.com/your-repo/Knowra.git
cd Knowra

# 2. Start the services
# This command will automatically build and start the frontend, backend, and database services.
docker-compose up --build
```
After the services have started, visit `http://localhost:3000` to see the frontend.

### 2. Local Development Setup

#### Backend

```bash
# 1. Navigate to the backend directory
cd backend

# 2. (Recommended) Create and activate a virtual environment
# It is highly recommended to use Python 3.12 for this project.
python -m venv venv
source venv/bin/activate  # on Windows, use `venv\Scripts\activate`

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the backend service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend

```bash
# 1. Navigate to the frontend directory
cd webapp

# 2. Install dependencies (pnpm is recommended)
pnpm install

# 3. Start the frontend development server
pnpm run dev
```
The frontend service runs on `http://localhost:3000` by default.

## Contributing

Contributions of any kind are welcome! If you have any questions or suggestions, please feel free to submit an Issue or a Pull Request. 