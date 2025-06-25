[English Version](README.md)

# Knowra：企业级 AI 知识库管理平台

## 概述

Knowra 是一款现代化的开源平台，专为企业知识的管理、检索与利用而设计。平台深度集成大语言模型（LLM）与先进的检索增强生成（RAG）技术，将非结构化文档转化为可智能查询的知识库。

## 技术栈

- **后端**：Python、FastAPI、SQLAlchemy、ChromaDB、LangChain、JWT
- **前端**：Next.js（React）、TypeScript、shadcn/ui、Tailwind CSS、Zustand、i18next

## 功能特性

- 多知识库管理
- 智能文档处理（支持 PDF、TXT、Markdown 等）
- 基于 RAG 的智能问答
- 用户与团队管理
- 模型管理
- **向量库（VDB）支持多 Collection**

## 快速上手

1. 后端环境配置（设置环境变量，确保数据库迁移，启动服务）
2. 前端环境配置（启动服务，访问 `/vdb`）
3. 常见问题排查：如遇 404/500，请检查 collection 表、API 路由注册和数据库文件位置。

## 可访问性与用户体验

- 新建 Collection 弹窗支持无障碍描述
- 测试连接按钮支持加载、成功、失败等状态反馈

## 环境变量

> **安全提示：请务必设置 `AES_KEY` 环境变量用于 AES-256 加密，且长度必须为 32 字节。**

在 `backend/.env` 文件中添加：

```env
AES_KEY=请替换为32字节安全随机字符串
```

推荐生成命令（Linux/macOS）：
```bash
head -c 32 /dev/urandom | base64 | cut -c1-32
```

## 更新日志

### 2024-06-24
- 新增向量数据库管理（Chroma、PGVector、Milvus）
- 支持向量库多 Collection
- 团队隔离、权限控制、连接测试、加密存储

### 2024-06-23
- 新增 SVG 图标管理
- 统一 API 返回格式
- 团队/用户管理重构，权限校验优化
- 移除所有 ForeignKey 约束

### 2024-06-22
- 知识库支持模型绑定
- 前端表单重构，用户体验与安全性提升

### 2024-06-21
- 文档处理支持暂停/恢复
- 修复并发与 hydration 问题

## 贡献

欢迎任何形式的贡献！如有问题或建议，请提交 Issue 或 Pull Request。
