# Knowra: Enterprise-Grade AI Knowledge Base Management Platform

[中文文档 (Chinese Version)](README_zh.md)

## Overview

Knowra is a modern, open-source platform for managing, retrieving, and utilizing enterprise knowledge. It integrates Large Language Models (LLMs) and advanced Retrieval-Augmented Generation (RAG) to turn unstructured documents into intelligent, queryable knowledge bases.

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, ChromaDB, LangChain, JWT
- **Frontend**: Next.js (React), TypeScript, shadcn/ui, Tailwind CSS, Zustand, i18next

## Features

- Multi-knowledge-base management
- Intelligent document processing (PDF, TXT, Markdown, etc.)
- RAG-based Q&A
- User and team management
- Model management
- **Multiple collections per Vector Database (VDB)**

## Quick Start

1. Set up backend (configure env, ensure DB migration, run service)
2. Set up frontend (run service, visit `/vdb`)
3. Troubleshooting: Ensure the `collection` table exists, check API route registration, and verify DB file location if errors occur.

## Accessibility & UX

- Collection creation dialog supports accessibility
- Test connection button provides loading, success, and failure feedback

## Environment Variables

> **Security Note:** Set the `AES_KEY` environment variable for AES-256 encryption (must be exactly 32 bytes).

Add to your `backend/.env` file:

```env
AES_KEY=Please replace with a 32-byte secure random string
```

Recommended generation command (Linux/macOS):
```bash
head -c 32 /dev/urandom | base64 | cut -c1-32
```

## Changelog

### 2024-06-24
- Added vector database management (Chroma, PGVector, Milvus)
- Support for multiple collections per VDB
- Team isolation, permission control, connection test, encrypted storage

### 2024-06-23
- Added SVG icon management
- Unified API response format
- Refactored team/user management, improved permission checks
- Removed all ForeignKey constraints

### 2024-06-22
- Knowledge base supports model binding
- Refactored frontend forms, improved UX and security

### 2024-06-21
- Document processing supports pause/resume
- Fixed concurrency and hydration issues

## Contributing

Contributions are welcome! Please submit issues or pull requests for questions or suggestions. 