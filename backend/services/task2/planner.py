from services.shared.llm_client import stream_response, generate_structured, parse_json_response
from services.task2.course_models import CoursePlan
from typing import AsyncGenerator, Optional, List
from datetime import datetime
import asyncio
import json
import logging
import fitz

logger = logging.getLogger(__name__)

INTAKE_SYSTEM_PROMPT = """You are EduPlan — an expert curriculum designer helping educators build structured courses.

Your ONLY job right now is to collect information through conversation. You must NOT generate a course plan yourself.

You need ALL of the following before signaling completion:
1. Subject / topic area
2. Target audience (age group, skill level, prior knowledge)
3. Duration and session frequency
4. Learning goals and outcomes

Rules:
- Ask ONE or TWO questions at a time
- Be conversational and encouraging  
- Once you have ALL four pieces of information, write a brief confirmation summary, then on a NEW LINE write exactly: [INTAKE_COMPLETE]
- NEVER generate a course plan, module list, or curriculum yourself — only collect info and signal completion
- Do NOT use [INTAKE_COMPLETE] until you have all four pieces of information

Current collected info:
{collected}"""

GENERATION_SYSTEM_PROMPT = """You are EduPlan — an expert curriculum designer.

Generate a complete, detailed course plan based on the intake information below.

REQUIREMENTS:
- Generate exactly {num_modules} modules with 3-5 lessons each
- Every lesson MUST include 2-3 real, publicly accessible resource URLs
- Use real URLs from YouTube, MDN, docs.python.org, W3Schools, Khan Academy, Coursera, HackerRank, LeetCode, Kaggle, etc.
- Include difficulty progression across modules (start beginner, end advanced)
- Each module must list prerequisites
- Each module must have an end assessment

Return ONLY valid JSON. No markdown fences, no explanation, just the raw JSON object:
{{
  "title": "Course title",
  "subject": "subject area",
  "description": "2-3 sentence course overview",
  "audience": {{
    "age_group": "e.g. 18-25",
    "skill_level": "beginner",
    "prior_knowledge": "what students already know"
  }},
  "total_duration": "e.g. 8 weeks",
  "session_frequency": "e.g. 2 sessions per week",
  "learning_goals": ["goal 1", "goal 2", "goal 3"],
  "modules": [
    {{
      "id": 1,
      "title": "Module title",
      "objectives": ["objective 1", "objective 2"],
      "difficulty": "beginner",
      "prerequisites": ["prerequisite 1"],
      "estimated_duration_weeks": 1,
      "lessons": [
        {{
          "id": 1,
          "title": "Lesson title",
          "topics": ["topic 1", "topic 2"],
          "difficulty": "beginner",
          "estimated_duration_minutes": 60,
          "resources": [
            {{"type": "youtube", "title": "Video title", "url": "https://www.youtube.com/watch?v=...", "description": "What this covers"}},
            {{"type": "article", "title": "Article title", "url": "https://...", "description": "What this covers"}}
          ]
        }}
      ],
      "assessment": {{
        "type": "quiz",
        "title": "Assessment title",
        "description": "What students will do",
        "estimated_duration_minutes": 30
      }}
    }}
  ],
  "version": 1
}}

Intake information:
{intake_info}"""

REFINEMENT_SYSTEM_PROMPT = """You are EduPlan — an expert curriculum designer.

The mentor wants to refine their course plan. Make ONLY the requested changes and preserve everything else.

Current course plan:
{current_plan}

If the mentor requests a change: apply it and return the COMPLETE updated course plan as raw JSON (no markdown, no explanation).
If the mentor asks a question (not a change request): answer it conversationally and end with [NO_UPDATE].

Return either pure JSON or a conversational answer ending with [NO_UPDATE]."""

SYLLABUS_IMPORT_PROMPT = """You are EduPlan — an expert curriculum designer.

Restructure the following syllabus content into a complete, detailed course plan.

Syllabus content:
{syllabus_text}

Return ONLY valid JSON using this exact schema (no markdown, no explanation):
{{
  "title": "Course title",
  "subject": "subject area", 
  "description": "2-3 sentence overview",
  "audience": {{
    "age_group": "inferred from syllabus",
    "skill_level": "beginner",
    "prior_knowledge": "inferred prerequisites"
  }},
  "total_duration": "inferred duration",
  "session_frequency": "inferred frequency",
  "learning_goals": ["goal 1", "goal 2"],
  "modules": [
    {{
      "id": 1,
      "title": "Module title",
      "objectives": ["objective"],
      "difficulty": "beginner",
      "prerequisites": [],
      "estimated_duration_weeks": 1,
      "lessons": [
        {{
          "id": 1,
          "title": "Lesson title",
          "topics": ["topic"],
          "difficulty": "beginner",
          "estimated_duration_minutes": 60,
          "resources": [
            {{"type": "youtube", "title": "Resource title", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "description": "Description"}}
          ]
        }}
      ],
      "assessment": {{
        "type": "quiz",
        "title": "Module assessment",
        "description": "Assessment description",
        "estimated_duration_minutes": 30
      }}
    }}
  ],
  "version": 1
}}"""


async def run_intake(
    message: str,
    history: List[dict],
    collected: dict,
) -> AsyncGenerator[str, None]:
    collected_str = json.dumps(collected, indent=2) if collected else "Nothing collected yet."
    system = INTAKE_SYSTEM_PROMPT.format(collected=collected_str)
    async for token in stream_response(message, system_prompt=system, history=history):
        yield token


async def generate_course_plan(intake_info: dict, num_modules: int = 5) -> CoursePlan:
    prompt = GENERATION_SYSTEM_PROMPT.format(
        num_modules=num_modules,
        intake_info=json.dumps(intake_info, indent=2),
    )
    raw = await generate_structured(prompt)
    plan_dict = parse_json_response(raw)
    plan_dict["created_at"] = datetime.utcnow().isoformat()
    return CoursePlan(**plan_dict)


async def refine_course_plan(
    message: str,
    current_plan: dict,
    history: List[dict],
) -> AsyncGenerator[str, None]:
    system = REFINEMENT_SYSTEM_PROMPT.format(
        current_plan=json.dumps(current_plan, indent=2)
    )
    async for token in stream_response(message, system_prompt=system, history=history):
        yield token


async def import_syllabus(file_bytes: bytes, filename: str) -> CoursePlan:
    # Run synchronous fitz PDF parsing in a thread to avoid blocking the async event loop
    def _extract_text() -> str:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = "\n".join(page.get_text("text") for page in doc)
        doc.close()
        return text

    text = await asyncio.to_thread(_extract_text)

    if not text.strip():
        raise ValueError("Could not extract text from the PDF. Make sure it's a text-based PDF, not a scanned image.")

    prompt = SYLLABUS_IMPORT_PROMPT.format(syllabus_text=text[:4000])  # cap input to keep JSON output manageable
    raw = await generate_structured(prompt)
    plan_dict = parse_json_response(raw)
    plan_dict["created_at"] = datetime.utcnow().isoformat()
    return CoursePlan(**plan_dict)
