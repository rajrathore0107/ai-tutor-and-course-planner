from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from services.task1.ingestion import ingest_pdf, ingest_pptx, ingest_url, ingest_youtube
from services.task1.rag_engine import answer_question, generate_quiz
from services.task1.vector_store import delete_session, get_session_source_count
from pydantic import BaseModel
from typing import Optional, List
import json
import uuid

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    parts: List[str]


class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: Optional[List[ChatMessage]] = []


class URLIngestRequest(BaseModel):
    session_id: str
    url: str
    source_type: str = "url"


class QuizRequest(BaseModel):
    session_id: str
    num_questions: int = 5


@router.post("/session")
async def create_session():
    session_id = str(uuid.uuid4())
    return {"session_id": session_id, "message": "Session created"}


@router.delete("/session/{session_id}")
async def end_session(session_id: str):
    delete_session(session_id)
    return {"message": "Session ended"}


@router.post("/ingest/pdf")
async def ingest_pdf_endpoint(
    session_id: str = Form(...),
    file: UploadFile = File(...),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files accepted")
    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(413, "File too large (max 50MB)")
    try:
        result = await ingest_pdf(session_id, contents, file.filename)
        return result
    except Exception as e:
        raise HTTPException(500, f"Failed to process PDF: {str(e)}")


@router.post("/ingest/pptx")
async def ingest_pptx_endpoint(
    session_id: str = Form(...),
    file: UploadFile = File(...),
):
    if not file.filename.lower().endswith((".pptx", ".ppt")):
        raise HTTPException(400, "Only PPTX files accepted")
    contents = await file.read()
    try:
        result = await ingest_pptx(session_id, contents, file.filename)
        return result
    except Exception as e:
        raise HTTPException(500, f"Failed to process PPTX: {str(e)}")


@router.post("/ingest/url")
async def ingest_url_endpoint(body: URLIngestRequest):
    """Process a YouTube video URL or any public webpage URL."""
    url = body.url.strip()

    # Detect YouTube regardless of what source_type was sent
    is_youtube = (
        "youtube.com" in url or
        "youtu.be" in url or
        body.source_type == "youtube"
    )

    try:
        if is_youtube:
            result = await ingest_youtube(body.session_id, url)
        else:
            result = await ingest_url(body.session_id, url)
        return result
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to process URL: {str(e)}")


@router.post("/chat")
async def chat(body: ChatRequest):
    source_count = get_session_source_count(body.session_id)
    if source_count == 0:
        raise HTTPException(400, "No sources loaded in this session.")

    history = [{"role": m.role, "parts": m.parts} for m in (body.history or [])]

    async def event_stream():
        try:
            async for token in answer_question(
                session_id=body.session_id,
                question=body.message,
                history=history,
            ):
                data = json.dumps({"token": token})
                yield f"data: {data}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/quiz")
async def generate_quiz_endpoint(body: QuizRequest):
    source_count = get_session_source_count(body.session_id)
    if source_count == 0:
        raise HTTPException(400, "No sources loaded.")
    num = max(3, min(10, body.num_questions))
    try:
        quiz = await generate_quiz(body.session_id, num)
        return quiz
    except Exception as e:
        raise HTTPException(500, f"Quiz generation failed: {str(e)}")
