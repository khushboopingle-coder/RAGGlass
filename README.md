<p align="center">
  <img src="frontend/public/favicon.svg" alt="RAGGlass Logo" width="64" height="64" />
</p>

<h1 align="center">RAGGlass</h1>

<p align="center">
  <strong>The Transparent Mind of RAG — Open the Black Box</strong>
</p>

<p align="center">
  <em>A full-stack RAG (Retrieval-Augmented Generation) observability platform that lets you upload documents, chunk text, generate vector embeddings, store them in ChromaDB, query via semantic search, and receive grounded AI answers — with every step visible and inspectable.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.11-blue?style=flat-square&logo=python" alt="Python 3.11" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite" alt="Vite 8" />
  <img src="https://img.shields.io/badge/ChromaDB-0.6-FF6F00?style=flat-square" alt="ChromaDB" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4-38BDF8?style=flat-square&logo=tailwindcss" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License MIT" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Usage Workflow](#usage-workflow)
- [API Reference](#api-reference)
- [RAG Pipeline Deep Dive](#rag-pipeline-deep-dive)
- [LLM Provider Configuration](#llm-provider-configuration)
- [Embedding Provider Configuration](#embedding-provider-configuration)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**RAGGlass** is a developer-oriented observability tool that makes every step of a Retrieval-Augmented Generation (RAG) pipeline fully transparent and interactive. Instead of treating RAG as a black box, RAGGlass opens up each stage — document ingestion, text chunking, embedding generation, vector storage, semantic retrieval, and AI answer synthesis — so you can inspect, debug, and understand exactly how your documents are processed and queried.

The platform is built as a full-stack application with a **FastAPI** backend and a **React** frontend, using **ChromaDB** as the vector store and supporting both **local (Ollama)** and **cloud (Groq)** LLM providers.

---

## Key Features

### 📄 Document Pipeline Observability

- **File Upload & Text Paste** — Upload PDF or TXT files, or paste raw text directly
- **Configurable Chunking** — Tune `chunk_size` and `chunk_overlap` parameters; boundary-aware splitting at paragraph, sentence, and word boundaries
- **Step-by-Step Pipeline Visualization** — Real-time pipeline bar tracks: `DOCUMENT → CHUNK → EMBED → STORE → QUERY → ANSWER`

### 🧬 Embedding & Vector Inspection

- **384-dimensional Dense Vectors** — Generated via `all-MiniLM-L6-v2` (local or via Hugging Face Inference API)
- **Vector Sparkline Visualizations** — Downsampled 24-bin SVG sparklines for every chunk embedding
- **Interactive Cosine Similarity** — Click any chunk to set it as a reference, then see real cosine similarity scores across all other chunks
- **Top Term Extraction** — Automatic keyword/term frequency analysis per chunk (stop-word filtered)

### 🔍 Semantic Search & AI Answers

- **ChromaDB Vector Search** — Cosine similarity retrieval with configurable `top_k`
- **Grounded AI Responses** — LLM answers constrained to only the retrieved document context
- **Source Attribution** — Every AI answer comes with traceable source chunks and similarity scores

### 🛡️ Authentication & Multi-Tenancy

- **JWT Authentication** — Secure signup/login with PBKDF2-HMAC-SHA256 password hashing
- **Project Isolation** — Each user manages their own projects; documents and vector stores are fully isolated per project

### 🔌 Flexible LLM & Embedding Providers

- **LLM**: Ollama (local, default) or Groq (cloud API)
- **Embeddings**: Local `sentence-transformers` (default) or Hugging Face Inference API (cloud, no GPU required)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     FRONTEND (React 19)                      │
│  ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌───────────────┐    │
│  │ Login   │ │ Workspace │ │ Pipeline │ │ Embeddings    │    │
│  │ Page    │ │ Page      │ │ Bar      │ │ Metadata      │    │
│  └─────────┘ └───────────┘ └──────────┘ └───────────────┘    │
│  ┌───────────────┐ ┌───────────┐ ┌────────────────────┐      │
│  │ Document      │ │ Query     │ │ AI Answer          │      │
│  │ Input         │ │ Section   │ │ + Sources Card     │      │
│  └───────────────┘ └───────────┘ └────────────────────┘      │
│                          │                                   │
│               Axios API Client (JWT Bearer)                  │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTP / REST
┌──────────────────────────┴───────────────────────────────────┐
│                    BACKEND (FastAPI)                         │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────┐    │
│  │ Auth     │ │ Projects  │ │Documents │ │ Query        │    │ 
│  │ Routes   │ │ Routes    │ │ Routes   │ │ Routes       │    │
│  └──────────┘ └───────────┘ └──────────┘ └──────────────┘    │
│                          │                                   │
│  ┌───────────────────────┴─────────────────────────────┐     │
│  │               RAG ENGINE (app/rag/)                 │     │
│  │  ┌────────┐ ┌────────┐ ┌──────────┐ ┌───────────┐   │     │
│  │  │Loader  │ │Chunker │ │Embeddings│ │Vector     │   │     │
│  │  │(PDF/TXT│ │(Overlap│ │(MiniLM / │ │Store      │   │     │
│  │  │ parser)│ │ splits)│ │ HF API)  │ │(ChromaDB) │   │     │
│  │  └────────┘ └────────┘ └──────────┘ └───────────┘   │     │
│  │  ┌────────────────┐  ┌───────────────────────┐      │     │
│  │  │ Retrieval      │  │ LLM (Ollama / Groq)   │      │     │
│  │  │ (Cosine Search)│  │ (Grounded QA)         │      │     │
│  │  └────────────────┘  └───────────────────────┘      │     │
│  └─────────────────────────────────────────────────────┘     │
│                          │                                   │
│  ┌───────────────┐  ┌────────────┐                           │
│  │ SQLite (Users,│  │ ChromaDB   │                           │
│  │ Projects,     │  │ (Vectors,  │                           │
│  │ Documents,    │  │  Cosine    │                           │
│  │ Chunks)       │  │  HNSW)     │                           │
│  └───────────────┘  └────────────┘                           │
└──────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer                 | Technology                                                         |
| :-------------------- | :----------------------------------------------------------------- |
| **Frontend**    | React 19, Vite 8, Tailwind CSS 4, Axios, Lucide React Icons        |
| **Backend**     | Python 3.11, FastAPI 0.115, Uvicorn, SQLAlchemy 2.0, Pydantic 2.10 |
| **Auth**        | JWT (PyJWT), PBKDF2-HMAC-SHA256 password hashing                   |
| **Database**    | SQLite (via SQLAlchemy ORM)                                        |
| **Vectors**     | ChromaDB 0.6 (Persistent Client, HNSW Cosine Space)                |
| **Embeddings**  | `all-MiniLM-L6-v2` — 384 dimensions (Local or Hugging Face API) |
| **LLM**         | Ollama (local models, e.g.,`llama3.2:3b`) or Groq (cloud API)    |
| **PDF Parsing** | pypdf 5.3                                                          |
| **Linting**     | OxLint (frontend)                                                  |

---

## Project Structure

```
ragglass/
├── backend/
│   ├── .env.example              # Environment variables template
│   ├── requirements.txt          # Python dependencies
│   ├── runtime.txt               # Python version (3.11.9)
│   └── app/
│       ├── main.py               # FastAPI app entry point, CORS, router registration
│       ├── database.py           # SQLAlchemy engine, session, Base
│       ├── models.py             # ORM models: User, Project, Document, Chunk
│       ├── schemas.py            # Pydantic request/response schemas
│       ├── auth.py               # JWT token creation, password hashing, auth dependency
│       ├── routes/
│       │   ├── auth.py           # POST /signup, /login, GET /me
│       │   ├── projects.py       # CRUD for projects
│       │   ├── documents.py      # Upload, paste, chunk, embed, delete documents
│       │   ├── query.py          # POST /{project_id}/query (RAG pipeline)
│       │   └── ollama.py         # GET /ollama/status (LLM health check)
│       └── rag/
│           ├── loader.py         # PDF & TXT text extraction
│           ├── chunker.py        # Boundary-aware text chunking with overlap
│           ├── embeddings.py     # Embedding generation (local / HF API)
│           ├── vector_store.py   # ChromaDB operations (add, query, delete)
│           ├── retrieval.py      # RAG pipeline orchestrator
│           ├── llm.py            # LLM dispatcher (Ollama ↔ Groq)
│           └── ollama.py         # Ollama client (status check, prompt generation)
│
├── frontend/
│   ├── index.html                # HTML entry point
│   ├── package.json              # Node dependencies & scripts
│   ├── vite.config.js            # Vite config with React, Tailwind, API proxy
│   ├── public/
│   │   ├── favicon.svg           # App favicon
│   │   └── icons.svg             # Icon sprites
│   └── src/
│       ├── main.jsx              # React DOM render entry
│       ├── App.jsx               # Root component (auth routing)
│       ├── App.css               # Legacy styles
│       ├── index.css             # Tailwind import & global styles
│       ├── context/
│       │   ├── AuthContext.jsx    # Auth state, login/signup/logout
│       │   └── ProjectContext.jsx # Project, document, pipeline, query state
│       ├── services/
│       │   └── api.js            # Axios client with JWT interceptor
│       ├── pages/
│       │   ├── LoginPage.jsx     # Login / Signup UI
│       │   └── WorkspacePage.jsx # Main workspace layout
│       ├── components/
│       │   ├── Navbar.jsx            # Top navigation bar
│       │   ├── PipelineBar.jsx       # 6-step RAG pipeline progress bar
│       │   ├── ProjectSidebar.jsx    # Left sidebar with project list
│       │   ├── NewProjectModal.jsx   # Create project modal dialog
│       │   ├── DocumentInput.jsx     # File upload / text paste + chunking controls
│       │   ├── ProcessStatusPanel.jsx # Right-side document status panel
│       │   ├── ChunkViewer.jsx       # Scrollable chunk card inspector
│       │   ├── EmbeddingsMetadata.jsx # Embedding table with sparklines & similarity
│       │   ├── VectorSparkline.jsx   # SVG sparkline for 384d → 24-bin vectors
│       │   ├── QuerySection.jsx      # Question input with top-K selector
│       │   ├── RetrievalResults.jsx  # Retrieved context chunks display
│       │   ├── AIAnswerCard.jsx      # AI-generated answer display
│       │   └── SourcesCard.jsx       # Source attribution card
│       └── utils/
│           ├── termExtraction.js # Stop-word filtered keyword frequency analysis
│           └── vectorMath.js     # Cosine similarity, vector downsampling, bounds
│
├── .gitignore                    # Root gitignore (Python, Node, DB, IDE, etc.)
└── README.md                    # ← You are here
```

---

## Getting Started

### Prerequisites

- **Python 3.11+** ([Download](https://www.python.org/downloads/))
- **Node.js 18+** and **npm** ([Download](https://nodejs.org/))
- **(Optional)** [Ollama](https://ollama.ai/) — for local LLM inference
- **(Optional)** [Groq API Key](https://console.groq.com/) — for cloud LLM inference
- **(Optional)** [Hugging Face API Token](https://huggingface.co/settings/tokens) — for cloud embeddings

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd ragglass/backend

# 2. Create and activate a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Edit .env with your configuration (see Environment Variables section)

# 5. Start the FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd ragglass/frontend

# 2. Install Node dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

The frontend will be available at `http://localhost:3000` (configured in `vite.config.js`). API requests to `/api/*` are automatically proxied to `http://localhost:8000`.

---

## Environment Variables

Create a `.env` file in `backend/` based on `.env.example`:

| Variable                        | Default                                         | Description                                                                   |
| :------------------------------ | :---------------------------------------------- | :---------------------------------------------------------------------------- |
| `SECRET_KEY`                  | *(required)*                                  | JWT signing secret key                                                        |
| `ALGORITHM`                   | `HS256`                                       | JWT algorithm                                                                 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440`                                        | Token expiry in minutes (default: 24 hours)                                   |
| `DATABASE_URL`                | `sqlite:///./ragglass.db`                     | SQLAlchemy database URL                                                       |
| `CHROMA_PERSIST_DIR`          | `./chroma_db`                                 | ChromaDB persistent storage directory                                         |
| `LLM_PROVIDER`                | `ollama`                                      | LLM provider:`ollama` (local) or `groq` (cloud)                           |
| `OLLAMA_BASE_URL`             | `http://localhost:11434`                      | Ollama API base URL                                                           |
| `OLLAMA_MODEL`                | `llama3.2:3b`                                 | Ollama model to use for answer generation                                     |
| `GROQ_API_KEY`                | *(required if using groq)*                    | Groq API key for cloud LLM                                                    |
| `EMBEDDING_PROVIDER`          | `local`                                       | Embedding provider:`local` (sentence-transformers) or `huggingface` (API) |
| `HF_API_KEY`                  | *(required if using huggingface)*             | Hugging Face API token for cloud embeddings                                   |
| `ALLOWED_ORIGINS`             | `http://localhost:5173,http://localhost:3000` | Comma-separated CORS allowed origins                                          |

---

## Usage Workflow

RAGGlass provides a **two-step document ingestion workflow** with full observability at each stage:

### Step 1 — Ingest & Chunk

1. **Create a Project** — Click "+ New Project" in the sidebar
2. **Add a Document** — Upload a PDF/TXT file or paste text directly
3. **Configure Chunking** — Adjust `chunk_size` (100–2000 chars) and `chunk_overlap` (0–500 chars)
4. **Click "1. Create Chunks"** — Text is split with boundary-aware logic (paragraph → sentence → word breaks)
5. **Inspect Chunks** — View every chunk in the Chunk Viewer panel with index, content, and character count

### Step 2 — Embed & Store

6. **Click "2. Generate Embeddings"** — 384-dimensional dense vectors are generated for each chunk
7. **Vectors stored in ChromaDB** — Cosine HNSW index, scoped per project
8. **Inspect Embeddings** — View sparkline visualizations, top terms, dimensions, and run interactive cosine similarity comparisons between chunks

### Step 3 — Query & Answer

9. **Ask a Question** — Type a natural language question in the Query Section
10. **Configure Top-K** — Select how many chunks to retrieve (1–10)
11. **Click "Retrieve & Answer"** — The question is embedded, searched against ChromaDB, and top-K chunks are sent to the LLM
12. **View Results** — See retrieved chunks with similarity scores, the AI-generated answer, and source attribution

The **Pipeline Bar** at the top shows real-time status for all 6 stages: `DOCUMENT → CHUNK → EMBED → STORE → QUERY → ANSWER`.

---

## API Reference

All endpoints are prefixed with `/api`. Authentication is via JWT Bearer token (except signup, login, and health check).

### Auth

| Method | Endpoint             | Description              |
| :----- | :------------------- | :----------------------- |
| POST   | `/api/auth/signup` | Register a new user      |
| POST   | `/api/auth/login`  | Login and receive JWT    |
| GET    | `/api/auth/me`     | Get current user profile |

### Projects

| Method | Endpoint               | Description              |
| :----- | :--------------------- | :----------------------- |
| GET    | `/api/projects`      | List user's projects     |
| POST   | `/api/projects`      | Create a new project     |
| GET    | `/api/projects/{id}` | Get project by ID        |
| DELETE | `/api/projects/{id}` | Delete project + vectors |

### Documents

| Method | Endpoint                                  | Description                               |
| :----- | :---------------------------------------- | :---------------------------------------- |
| POST   | `/api/projects/{id}/documents`          | Upload file → chunk + embed + store      |
| POST   | `/api/projects/{id}/process`            | Paste text → chunk + embed + store       |
| POST   | `/api/projects/{id}/chunk-upload`       | Upload file → chunk only (no embeddings) |
| POST   | `/api/projects/{id}/chunk-text`         | Paste text → chunk only (no embeddings)  |
| POST   | `/api/projects/{id}/embed`              | Generate embeddings for existing chunks   |
| GET    | `/api/projects/{id}/documents`          | List all documents in project             |
| DELETE | `/api/projects/{id}/documents`          | Delete all documents + vectors            |
| DELETE | `/api/projects/{id}/documents/{doc_id}` | Delete a specific document + vectors      |

### RAG Query

| Method | Endpoint                     | Description                                   |
| :----- | :--------------------------- | :-------------------------------------------- |
| POST   | `/api/projects/{id}/query` | Execute RAG pipeline (embed → search → LLM) |

### System

| Method | Endpoint               | Description                      |
| :----- | :--------------------- | :------------------------------- |
| GET    | `/api/health`        | Health check                     |
| GET    | `/api/ollama/status` | Ollama connection & model status |

---

## RAG Pipeline Deep Dive

```
User Question
     │
     ▼
┌─────────────┐     ┌───────────────┐     ┌───────────────────┐
│ Embed Query │───▶│ ChromaDB      │────▶│ Top-K Chunks      │
│ (MiniLM)    │     │ Cosine Search │     │ (with similarity) │
└─────────────┘     └───────────────┘     └────────┬──────────┘
                                                   │
                                                   ▼
                                         ┌───────────────────┐
                                         │ LLM (Ollama/Groq) │
                                         │ Grounded Prompt   │
                                         │ + Context Chunks  │
                                         └────────┬──────────┘
                                                   │
                                                   ▼
                                         ┌───────────────────┐
                                         │ AI Answer +       │
                                         │ Source Attribution│
                                         └───────────────────┘
```

### Chunking Strategy

The chunker uses **boundary-aware overlapping splits**:

1. Attempts to break at **paragraph boundaries** (`\n\n`)
2. Falls back to **sentence boundaries** (`. `)
3. Falls back to **word boundaries** (spaces)
4. Configurable `chunk_size` (min 50) and `chunk_overlap`

### Embedding Model

- **Model**: `all-MiniLM-L6-v2` (SentenceTransformers)
- **Dimensions**: 384
- **Vector Space**: Cosine similarity (HNSW index in ChromaDB)

### LLM Grounding Prompt

Both Ollama and Groq use the same grounding strategy:

- System prompt instructs the LLM to answer **only** from the provided document context
- If the answer cannot be determined, the LLM explicitly states insufficient information
- Input validation limits protect against resource abuse (question: 1000 chars, context: 12000 chars)

---

## LLM Provider Configuration

### Ollama (Local — Default)

```bash
# Install Ollama: https://ollama.ai/
ollama pull llama3.2:3b

# In .env:
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

### Groq (Cloud)

```bash
# Get API key: https://console.groq.com/
# In .env:
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
```

---

## Embedding Provider Configuration

### Local (Default)

Requires `sentence-transformers` and PyTorch to be installed (included in `requirements.txt`).

```bash
# In .env:
EMBEDDING_PROVIDER=local
```

### Hugging Face Inference API (Cloud)

No GPU or local model required. Uses the free Hugging Face Inference API.

```bash
# Get token: https://huggingface.co/settings/tokens
# In .env:
EMBEDDING_PROVIDER=huggingface
HF_API_KEY=your_hf_token_here
```

---

## Security Notes

- Passwords are hashed using **PBKDF2-HMAC-SHA256** with 100,000 iterations
- JWT tokens expire after 24 hours by default (configurable)
- API keys are never exposed in error responses (all external API errors return generic messages)
- File upload validation: max **10 MB**, allowed extensions: `.pdf`, `.txt`, `.md`, `.csv`, `.json`
- Pasted text validation: max **500,000 characters**
- CORS origins are configurable via environment variable

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is open source. See the [LICENSE](LICENSE) file for details.

---
