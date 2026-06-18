# EduAssist — AI-Powered Learning & Course Planning Platform

> Samasocial Technical Assignment · Full-Stack AI Developer

Two production-quality AI features built on a shared FastAPI backend:
- **Task 1 — Multi-Source AI Learning Assistant** (port 5173)
- **Task 2 — AI Course Planning Assistant for Mentors** (port 5174)

---

## Live Demo

| App | URL |
|-----|-----|
| Task 1 — Learning Assistant | http://localhost:5173 |
| Task 2 — Course Planner | http://localhost:5174 |
| Backend API Docs | http://localhost:8000/docs |

---

## Architecture

```
edu-assist/
├── backend/                    # Shared FastAPI backend
│   ├── main.py                 # App entry, CORS, lifespan hooks
│   ├── config.py               # Pydantic settings from .env
│   ├── routers/
│   │   ├── task1.py            # /api/task1/* — Learning Assistant
│   │   └── task2.py            # /api/task2/* — Course Planner
│   └── services/
│       ├── shared/             # Loaded once, used by both tasks
│       │   ├── llm_client.py   # Gemini 1.5 Flash (streaming + structured)
│       │   ├── embedding_service.py  # all-MiniLM-L6-v2 (single load)
│       │   ├── supabase_client.py    # Shared DB connection pool
│       │   └── chunker.py      # Token-aware text chunker
│       ├── task1/
│       │   ├── parsers/        # PDF, PPTX, URL, YouTube parsers
│       │   ├── vector_store.py # ChromaDB session-scoped store
│       │   ├── ingestion.py    # Orchestrates parsing → chunking → embedding
│       │   └── rag_engine.py   # Retrieval + citation-aware answer generation
│       └── task2/
│           ├── course_models.py  # Pydantic schema for CoursePlan JSON
│           └── planner.py        # Intake, generation, refinement, syllabus import
├── task1-frontend/             # React + Vite (port 5173)
└── task2-frontend/             # React + Vite (port 5174)
```

### Why a shared backend?

Both tasks share:
- A `sentence-transformers` embedding model (~80MB) — loaded **once** at startup, shared across all requests
- A Supabase connection pool — one pool, not two
- Utility code (chunking, Gemini client, PDF parsing) — imported from `services/shared/`, not duplicated

Task-specific logic lives entirely within `services/task1/` and `services/task2/` with zero cross-dependencies.

In production these would be separate services with independent scaling policies (Task 1 is CPU-heavy for embedding; Task 2 is I/O-bound for LLM calls). For this assignment, the shared backend reduces infrastructure overhead with no practical downside at this scale.

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Backend | FastAPI + Python | Async-native, SSE streaming, clean router structure |
| LLM | Gemini 1.5 Flash | 1M context window, generous free tier, fast |
| Embeddings | `sentence-transformers` (all-MiniLM-L6-v2) | No API cost, runs locally, fast |
| Vector Store | ChromaDB (in-memory) | Zero infra, session-scoped, no persistence needed |
| PDF parsing | `pymupdf` (fitz) | Best-in-class extraction, page-level metadata |
| PPTX parsing | `python-pptx` | Slide-level text + title extraction |
| YouTube | `youtube-transcript-api` | Timestamped transcript, no audio processing needed |
| Web scraping | `httpx` + `BeautifulSoup4` | Fast, handles most public pages |
| Database | Supabase (Postgres) | Session + plan persistence |
| Frontend | React + Vite + Tailwind | Fast builds, Zustand for state |
| Streaming | Server-Sent Events (SSE) | Simpler than WebSockets for unidirectional stream |

---

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Gemini API key ([get one free](https://aistudio.google.com))
- A Supabase project ([create one free](https://supabase.com))

### 1. Clone
```bash
git clone https://github.com/rajrathore0107/edu-assist.git
cd edu-assist
```

### 2. Supabase Schema
Open your Supabase project → SQL Editor → paste and run `supabase_schema.sql`

### 3. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows

pip install -r requirements.txt

# Copy env template and fill in your values
cp .env.example .env
# Edit .env with your GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY

uvicorn main:app --reload --port 8000
```

Backend starts at http://localhost:8000
API docs at http://localhost:8000/docs

### 4. Task 1 Frontend
```bash
cd task1-frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### 5. Task 2 Frontend
```bash
cd task2-frontend
npm install
npm run dev
# Opens at http://localhost:5174
```

---

## Environment Variables

```env
# backend/.env
GEMINI_API_KEY=your_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# Optional (defaults shown)
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
MAX_UPLOAD_SIZE_MB=50
CHUNK_SIZE=400
CHUNK_OVERLAP=50
TOP_K_RESULTS=5
```

---

## Features

### Task 1 — Multi-Source AI Learning Assistant

| Feature | Status |
|---------|--------|
| PDF ingestion with page citations | ✅ |
| PPTX ingestion with slide citations | ✅ |
| YouTube transcript with timestamp citations | ✅ |
| Public webpage scraping | ✅ |
| Mix multiple sources in one session | ✅ |
| Vector retrieval (ChromaDB + sentence-transformers) | ✅ |
| Streaming responses (SSE, token by token) | ✅ |
| Session memory for follow-up questions | ✅ |
| Inline source citations in answers | ✅ |
| Per-source auto-summary on ingestion | ✅ (Bonus) |
| Interactive Quiz Me mode | ✅ (Bonus) |
| Multi-source attribution per answer | ✅ (Bonus) |

### Task 2 — AI Course Planning Assistant

| Feature | Status |
|---------|--------|
| Guided intake conversation | ✅ |
| Structured course plan generation (JSON) | ✅ |
| Multi-turn refinement ("make module 2 simpler") | ✅ |
| Split-panel UI (chat + live preview) | ✅ |
| Inline field editing in plan preview | ✅ |
| JSON export | ✅ |
| Real public resource links per lesson | ✅ |
| Module-end assessments | ✅ |
| Difficulty progression indicator | ✅ (Bonus) |
| Prerequisites per module | ✅ (Bonus) |
| Syllabus PDF import + restructure | ✅ (Bonus) |

---

## API Reference

### Task 1
```
POST /api/task1/session              Create session
POST /api/task1/ingest/pdf          Upload PDF
POST /api/task1/ingest/pptx         Upload PPTX
POST /api/task1/ingest/url          Add YouTube or webpage URL
POST /api/task1/chat                Stream answer (SSE)
POST /api/task1/quiz                Generate quiz JSON
DELETE /api/task1/session/{id}      End session
```

### Task 2
```
POST /api/task2/session             Create session
POST /api/task2/intake              Stream intake conversation (SSE)
POST /api/task2/generate            Generate course plan JSON
POST /api/task2/refine              Stream refinement response (SSE)
POST /api/task2/export              Validate + return final plan
POST /api/task2/import-syllabus     Import existing syllabus PDF
```

---

## Architectural Decisions

**ChromaDB in-memory vs persistent:** Sessions are ephemeral — users add sources, ask questions, done. There's no use case for persisting vector embeddings between sessions, and in-memory gives sub-millisecond retrieval with zero infra.

**Sentence-transformers locally vs embedding API:** The `all-MiniLM-L6-v2` model is 80MB, loads in ~2 seconds, and produces high-quality embeddings with zero API cost and no rate limits. At the query volumes of this assignment, there's no reason to pay for an embedding API.

**SSE vs WebSockets:** SSE is unidirectional (server → client), which is exactly what streaming LLM output requires. WebSockets add bidirectional overhead that's unnecessary here.

**Gemini 1.5 Flash:** The 1M context window means we never hit context limits even with large documents. The free tier is generous enough for development and demo, and latency is competitive with GPT-3.5.

**Pydantic for course plan schema:** Strict validation at the API boundary ensures the JSON returned to the frontend is always well-formed, making inline editing and export reliable.

---

## Known Limitations

- YouTube ingestion requires videos with English captions enabled. Auto-generated captions work but may have transcription errors.
- Web scraping uses HTTP requests — heavily JavaScript-rendered SPAs may not extract cleanly. A Playwright fallback could be added for production.
- ChromaDB session stores are in-memory and lost on server restart. Production would use a persistent vector store (Pinecone, Weaviate) with session IDs as namespace keys.
- Course plan resource URLs are generated by the LLM and are real publicly-known resources, but should be verified before publishing to students.
