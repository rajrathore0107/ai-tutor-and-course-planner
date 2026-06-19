# AI Tutor & Course Planner

A full-stack, multi-agent AI learning platform built for the **Samasocial Technical Assessment**. Two independent, production-quality AI features sharing a single FastAPI backend.

| App | Description | Port |
|-----|-------------|------|
| **EduAssist** (Task 1) | Multi-Source AI Learning Assistant — RAG chatbot over PDFs, slides, video, and the web | `5173` |
| **EduPlan** (Task 2) | AI Course Planning Assistant — conversational curriculum builder for mentors | `5174` |

---

## 🚀 Features

### Task 1 — EduAssist (Multi-Source AI Learning Assistant)

A chatbot that grounds every answer strictly in content the user provides.

- **Multi-source ingestion:** PDF (`pymupdf`), PPTX (`python-pptx`), YouTube transcripts (any caption language, not just English), and public webpages (`httpx` + `BeautifulSoup4`)
- **RAG pipeline:** Text is chunked, embedded locally with `sentence-transformers` (`all-MiniLM-L6-v2`), and stored in a per-session ChromaDB collection — no full-document prompt dumping
- **Streaming answers:** Token-by-token via Server-Sent Events
- **Polished inline citations:** The citation parser converts LLM citation tags (`[SOURCE:pdf:page 4]`) into hidden markdown links *before* the text reaches `ReactMarkdown`, rather than splitting content into separate render fragments. Keeping a single contiguous string flowing through the markdown renderer fixed list-numbering bugs (`1. 1. 1.`) and broken bold/asterisk formatting that occur when markdown context is interrupted mid-stream. Citations render as styled, color-coded badges (`[📄 page 4]`, `[📊 slide 3]`, `[▶ 3:22]`) so it's immediately clear which source backs each part of the answer — these are visual references, not clickable links.
- **Session memory:** Follow-up questions retain conversation context
- **Source management:** Add multiple sources per session, view auto-generated summaries, remove sources individually
- **Bonus — Quiz Me:** Generates an interactive multiple-choice quiz from everything loaded in the session, with score tracking and answer explanations

### Task 2 — EduPlan (AI Course Planning Assistant)

A guided conversational tool that turns a mentor's intent into a structured, editable curriculum.

- **Guided intake:** Conversationally collects subject, audience, duration/frequency, and learning goals before generating anything. The intake system instruction is passed directly into `genai.GenerativeModel` (not re-injected per turn), so the model reliably remembers its task and emits the `[INTAKE_COMPLETE]` signal once it actually has everything it needs, instead of drifting into freeform answers after a few turns.
- **Structured generation with active correction:** Pydantic `@field_validator`s coerce common LLM "creative" output back into valid shape rather than failing the whole request:
  - Fractional module durations (`0.4` weeks) are rounded to valid integers
  - Decimal lesson IDs (`module.lesson` notation like `2.3`) are parsed back to plain integers
  - Off-schema difficulty labels (`"advanced_intermediate"`) are mapped to the nearest valid enum
  - Off-schema assessment types (`"mock_test"`) are mapped to the nearest valid literal
- **No truncated plans:** `max_output_tokens` for structured generation is set high enough (`32768`) that full multi-module course plans complete without being cut off mid-JSON.
- **Split-panel UI:** Chat on the left, live curriculum preview on the right
- **Inline editing:** Click any field in the plan — title, objective, lesson name, assessment — to edit directly
- **Conversational refinement:** "Make module 2 simpler" or "add a project to module 4" updates the live plan
- **Difficulty progression bar:** Visual beginner → intermediate → advanced indicator across modules
- **JSON export:** One-click download of the final plan
- **Always-working resources:** Every lesson resource (YouTube videos, articles, documentation links, practice exercises) is a clickable link. Rather than trusting the LLM's exact URL — which it can't verify since it has no live search access — the frontend converts AI-generated YouTube links into YouTube search links and article/documentation links into Google searches for the resource title. The mentor always lands on a real, relevant page instead of risking a dead or hallucinated link.
- **Bonus — Syllabus import:** Upload an existing PDF syllabus; parsing runs in a background thread (`asyncio.to_thread`) so the backend stays responsive, and the AI restructures the content into the full schema with resources and assessments.

---

## 🏗 Architecture & Key Decisions

```
edu-assist/
├── backend/                    # Shared FastAPI backend
│   ├── routers/                # task1.py, task2.py — route-level separation
│   └── services/
│       ├── shared/              # Loaded once, used by both tasks
│       │   ├── llm_client.py        # Gemini client (async, streaming + structured)
│       │   ├── embedding_service.py # sentence-transformers, single load
│       │   ├── supabase_client.py   # Shared connection pool
│       │   └── chunker.py           # Token-aware text chunker
│       ├── task1/               # Parsers, vector store, RAG engine
│       └── task2/               # Course schema + validators, planner state machine
├── task1-frontend/              # React + Vite — EduAssist
└── task2-frontend/              # React + Vite — EduPlan
```

**Shared backend, isolated services.** Both tasks import from `services/shared/` for the embedding model, LLM client, and Supabase pool — each loaded exactly once at startup rather than duplicated per task. Task-specific logic stays fully isolated in `services/task1/` and `services/task2/` with no cross-imports. At this scale the shared backend removes real infrastructure overhead with no practical downside; in production these would likely split into separate services since Task 1 is embedding/CPU-bound and Task 2 is LLM/IO-bound.

**Async all the way down.** Calling Gemini's synchronous SDK methods from inside async route handlers silently blocks FastAPI's event loop during generation — fine for one request, but it stalls every other concurrent request on the server. All LLM calls use the async SDK methods (`generate_content_async`, `send_message_async`), and PDF parsing for syllabus import runs in a thread pool via `asyncio.to_thread` since PyMuPDF itself is synchronous and CPU-bound.

**System instructions, not re-injected prompts.** An earlier version of the Task 2 intake flow re-sent the system prompt as part of the user message on every turn, which Gemini doesn't treat with the same priority as an actual system instruction — the model would follow it for a turn or two then drift, never emitting `[INTAKE_COMPLETE]`. Passing `system_instruction` directly to `genai.GenerativeModel` fixed this; the constraint persists for the life of the chat session instead of competing with the conversation.

**Schema validation that corrects instead of just rejecting.** LLM JSON output is reliably *shaped* correctly but not always *valued* correctly — a duration field might come back as `0.4` weeks instead of a whole number, or a difficulty label might be `"advanced_intermediate"` instead of one of the three allowed values. Pydantic field validators on `CoursePlan` coerce these into valid values rather than failing the entire generation and forcing a costly retry.

**ChromaDB in-memory, not persistent.** Learning sessions are short-lived — load sources, ask questions, done. In-memory per-session collections give sub-millisecond retrieval with zero infra. Restarting the backend clears all sessions, an accepted trade-off for this scope.

**Local embeddings over an embedding API.** `all-MiniLM-L6-v2` is ~80MB, loads in a couple of seconds, and produces solid retrieval quality with zero per-query cost and no external rate limits.

**Handling LLM-generated resource URLs.** Gemini has no live search access, so any exact URL it produces — especially 11-character YouTube video IDs — is fundamentally unverifiable at generation time. Rather than adding a backend search/verification step that would slow down every course generation, `ResourceLink.jsx` converts AI-generated YouTube links into YouTube search links and article/documentation links into Google searches for the resource's title, before they're ever rendered as clickable. This guarantees every resource a mentor clicks lands on a real, relevant page — the resource *titles and descriptions* come from the LLM, but the *destination* is always a guaranteed-working search rather than a single unverifiable exact URL.

---

## 🛠 Tech Stack

| Layer | Choice |
|-------|--------|
| Backend | FastAPI, Pydantic (with custom field validators), Pydantic Settings |
| LLM | Google Gemini (`gemini-2.5-flash`), async SDK |
| Embeddings | `sentence-transformers` (`all-MiniLM-L6-v2`), local, zero-cost |
| Vector store | ChromaDB (in-memory, session-scoped) |
| Document parsing | `pymupdf` (PDF), `python-pptx` (slides), `youtube-transcript-api` (video) |
| Web scraping | `httpx` + `BeautifulSoup4` |
| Database | Supabase (Postgres) |
| Frontend | React (Vite), Zustand, Tailwind CSS, Lucide Icons |
| Markdown rendering | `react-markdown` + `remark-gfm`, with citation-to-markdown-link preprocessing |
| Streaming | Server-Sent Events (SSE) |

---

## ⚙️ Setup

### Prerequisites
- Python 3.11+ (tested on 3.13)
- Node.js 18+
- A [Gemini API key](https://aistudio.google.com) (free tier)
- A [Supabase project](https://supabase.com) (free tier)

### 1. Clone
```bash
git clone https://github.com/rajrathore0107/ai-tutor-and-course-planner.git
cd ai-tutor-and-course-planner
```

### 2. Supabase schema
Open your Supabase project → SQL Editor → run the contents of `supabase_schema.sql`. RLS is intentionally left disabled for this assignment since there's no user auth layer.

### 3. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here   # the eyJ... anon/public key

ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
MAX_UPLOAD_SIZE_MB=50
CHUNK_SIZE=400
CHUNK_OVERLAP=50
TOP_K_RESULTS=5
```

Start the server:
```bash
uvicorn main:app --port 8000
```
> `--reload` is omitted by default — on macOS it watches the entire `venv/` directory and can trigger a restart loop. For development with auto-reload, use:
> `uvicorn main:app --reload --reload-dir . --reload-exclude venv --port 8000`

### 4. Frontends
```bash
# Task 1 — EduAssist
cd task1-frontend
npm install
npm run dev    # http://localhost:5173

# Task 2 — EduPlan (separate terminal)
cd task2-frontend
npm install
npm run dev    # http://localhost:5174
```

Both proxy `/api/*` to `localhost:8000` — no extra config needed.

---

## 📡 API Reference

### Task 1 — `/api/task1`
```
POST   /session              Create a learning session
POST   /ingest/pdf            Upload PDF (multipart)
POST   /ingest/pptx           Upload PPTX (multipart)
POST   /ingest/url            Add a YouTube URL or public webpage URL
POST   /chat                  Stream a RAG answer with citations (SSE)
POST   /quiz                  Generate a quiz from all loaded sources
DELETE /session/{id}          End a session
```

### Task 2 — `/api/task2`
```
POST   /session                Create a planning session
POST   /intake                 Stream guided intake conversation (SSE)
POST   /generate               Generate the structured course plan
POST   /refine                 Stream a refinement response (SSE)
POST   /export                 Validate and return the final plan
POST   /import-syllabus        Import and restructure an existing PDF syllabus
```

---

## ✅ Known Limitations

- **YouTube ingestion requires captions** (manual or auto-generated) in any language — there's no audio transcription fallback for videos with no captions at all.
- **ChromaDB sessions are in-memory** and are lost on backend restart. A production version would use a persistent vector store with session-namespaced collections.
- **Task 2 resource links resolve via search, not exact URLs.** Since Gemini has no live search access, resource titles/descriptions are LLM-generated but the actual link a mentor clicks is always converted to a YouTube or Google search for that title — guaranteed to work, but not necessarily the single exact video or article the LLM "had in mind."
- **Web scraping** uses static HTTP requests, not a headless browser — heavily JavaScript-rendered pages may not extract cleanly.
- **No authentication layer** — Supabase RLS is disabled by design for this assignment scope; sessions are identified by UUID only.

---

## 🎥 Demo Video

*(Add Loom/screen recording link here)*
