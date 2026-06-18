# AI Tutor & Course Planner

A full-stack, multi-agent AI learning platform built for the **SamaSocial Technical Assessment**. This repository contains two independent, highly-polished AI features designed to enhance the learning and teaching experience.

## 🚀 Features

### Task 1: Multi-Source AI Learning Assistant (RAG)
A web-based AI chatbot that dynamically grounds its answers in user-uploaded content.
- **Multi-modal Ingestion:** Supports PDF, PPTX, YouTube Videos, and Webpages.
- **Intelligent RAG:** Chunks text, stores vector embeddings (ChromaDB), and performs similarity search to prevent prompt bloat.
- **Streaming Responses:** Answers stream token-by-token for a fast, responsive UX.
- **Clickable Citations:** Markdown citations (`[📄 page 4]`) are processed safely and UI badges are rendered. URL and YouTube citations are clickable and redirect to source searches.
- **Bonus Feature - "Quiz Me":** Auto-generates structured JSON quizzes based on the uploaded session context.

### Task 2: AI Course Planning Assistant
A conversational AI designed to help mentors build full structured curricula.
- **Guided Intake:** Asks the mentor for target audience, goals, and duration.
- **Structured JSON Generation:** Enforces strict Pydantic schema validation for reliable, parseable course plans.
- **Interactive UI:** Split-panel design allows the mentor to chat on the left and see a live-updating curriculum on the right.
- **Inline Editing:** Mentors can click any field in the generated course plan to manually edit it.
- **Bonus Feature - Syllabus Import:** Mentors can upload a legacy PDF syllabus and the AI will extract and restructure it into a modern course plan.

## 🏗 Architectural Decisions & Trade-offs

1. **Monorepo Structure with Shared Backend:** 
   To reduce duplication, both frontend tasks share a single FastAPI backend. This allows them to share core utilities like the LLM client, vector store, and document parsers.
2. **Handling LLM URL Hallucinations (Frontend Fallback):**
   Generative LLMs without live search APIs inherently hallucinate exact URLs (like 11-character YouTube IDs). Instead of building a heavy, high-latency web search orchestrator in the backend to verify every link (which would drastically increase course generation time), I implemented an intelligent frontend fallback. The `ResourceLink` component detects invalid or hallucinated URLs and dynamically converts them into YouTube/Google search queries for the resource title.
3. **Regex Markdown Pre-processing:**
   To render inline citations without breaking Markdown lists, the frontend intercepts the LLM output and uses Regex to inject standard markdown links *before* passing the text to `ReactMarkdown`.

## 🛠 Tech Stack

- **Backend:** FastAPI, Python, Pydantic, PyMuPDF (`fitz`), ChromaDB
- **Frontend:** React (Vite), Zustand (State Management), TailwindCSS, Lucide Icons
- **AI / LLM:** Google Gemini API (`gemini-2.5-flash`)

## ⚙️ Setup Instructions

### 1. Backend Setup
Navigate to the backend directory and set up your Python environment:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the FastAPI server:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup (Task 1 & Task 2)
Both frontends use Vite and are configured to proxy API requests to `localhost:8000`.

**Start Task 1 (AI Learning Assistant):**
```bash
cd task1-frontend
npm install
npm run dev # Runs on http://localhost:5173
```

**Start Task 2 (Course Planner):**
```bash
cd task2-frontend
npm install
npm run dev # Runs on http://localhost:5174
```

## 🎥 Demo Video
*(Insert Loom Link Here)*
