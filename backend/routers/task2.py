from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from services.task2.planner import (
    run_intake, generate_course_plan, refine_course_plan, import_syllabus
)
from services.task2.course_models import CoursePlan
from pydantic import BaseModel
from typing import Optional, List
import json
import uuid

router = APIRouter()


# ─── Request Models ───────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    parts: List[str]


class IntakeRequest(BaseModel):
    session_id: str
    message: str
    history: Optional[List[ChatMessage]] = []
    collected_info: Optional[dict] = {}


class GenerateRequest(BaseModel):
    session_id: str
    intake_info: dict
    num_modules: int = 5


class RefineRequest(BaseModel):
    session_id: str
    message: str
    current_plan: dict
    history: Optional[List[ChatMessage]] = []


class UpdatePlanRequest(BaseModel):
    session_id: str
    plan: dict  # Full plan from frontend inline edits


# ─── Session ──────────────────────────────────────────────────────────────────

@router.post("/session")
async def create_session():
    session_id = str(uuid.uuid4())
    return {"session_id": session_id}


# ─── Intake Conversation ──────────────────────────────────────────────────────

@router.post("/intake")
async def intake_chat(body: IntakeRequest):
    """
    Stream intake conversation. Frontend detects [INTAKE_COMPLETE] signal
    and switches to generation mode.
    """
    history = [{"role": m.role, "parts": m.parts} for m in (body.history or [])]

    async def event_stream():
        try:
            async for token in run_intake(
                message=body.message,
                history=history,
                collected=body.collected_info or {},
            ):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── Course Plan Generation ───────────────────────────────────────────────────

@router.post("/generate")
async def generate_plan(body: GenerateRequest):
    """
    Generate a full structured course plan from intake data.
    Returns the complete CoursePlan JSON.
    """
    try:
        plan = await generate_course_plan(body.intake_info, body.num_modules)
        return plan.model_dump()
    except Exception as e:
        raise HTTPException(500, f"Plan generation failed: {str(e)}")


# ─── Refinement ───────────────────────────────────────────────────────────────

@router.post("/refine")
async def refine_plan(body: RefineRequest):
    """
    Stream a refinement response. If the LLM updates the plan,
    it returns JSON; if it just answers a question, it signals [NO_UPDATE].
    """
    history = [{"role": m.role, "parts": m.parts} for m in (body.history or [])]

    async def event_stream():
        try:
            async for token in refine_course_plan(
                message=body.message,
                current_plan=body.current_plan,
                history=history,
            ):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── Plan Export ──────────────────────────────────────────────────────────────

@router.post("/export")
async def export_plan(body: UpdatePlanRequest):
    """Validate and return the final course plan as clean JSON."""
    try:
        plan = CoursePlan(**body.plan)
        return {
            "plan": plan.model_dump(),
            "json_string": plan.model_dump_json(indent=2),
        }
    except Exception as e:
        raise HTTPException(422, f"Invalid plan structure: {str(e)}")


# ─── Syllabus Import (Bonus) ──────────────────────────────────────────────────

@router.post("/import-syllabus")
async def import_syllabus_endpoint(file: UploadFile = File(...)):
    """Import and restructure an existing syllabus PDF into a course plan."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files accepted for syllabus import")

    contents = await file.read()
    try:
        plan = await import_syllabus(contents, file.filename)
        return plan.model_dump()
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Syllabus import failed: {str(e)}")

