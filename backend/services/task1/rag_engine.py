from services.task1.vector_store import query_session
from services.shared.llm_client import stream_response, generate_structured, parse_json_response
from typing import AsyncGenerator, List, Optional
import logging
import json

logger = logging.getLogger(__name__)

RAG_SYSTEM_PROMPT = """You are EduAssist — an intelligent learning assistant.
You ONLY answer questions based on the provided source material.
If the question cannot be answered from the sources, say: "This topic isn't covered in the loaded materials."

When answering:
- Be clear, educational, and thorough
- Explain concepts in simple terms when asked
- Use inline citations in this EXACT format: [SOURCE:source_type:reference]
  - For PDF: [SOURCE:pdf:page 4]
  - For PPTX: [SOURCE:pptx:slide 3]
  - For YouTube: [SOURCE:youtube:3:22]
  - For URL: [SOURCE:url:domain.com]
- You may cite multiple sources if relevant
- For "explain simply" requests, use analogies and plain language
- Support follow-up questions using conversation history

Source material:
{context}"""

QUIZ_SYSTEM_PROMPT = """You are an expert educator creating assessment questions.
Based on the provided source material, generate {num_questions} multiple-choice questions.

Rules:
- Questions must be answerable ONLY from the provided content
- Each question has exactly 4 options (A, B, C, D)
- Include the correct answer and a brief explanation citing the source
- Vary difficulty: mix recall, comprehension, and application questions

Return ONLY valid JSON in this exact structure:
{{
  "questions": [
    {{
      "id": 1,
      "question": "...",
      "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
      "correct": "A",
      "explanation": "...",
      "source_ref": "e.g. slide 3 or page 12 or 2:45 in video"
    }}
  ]
}}"""


def build_context_from_chunks(chunks: List[dict]) -> str:
    """Format retrieved chunks into a context string with source labels."""
    if not chunks:
        return "No relevant content found."

    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        source_type = chunk.get("source_type", "unknown")
        source_label = chunk.get("source_label", "")

        # Build human-readable reference
        if source_type == "pdf":
            ref = f"[PDF: {source_label}, Page {chunk.get('page', '?')}]"
        elif source_type == "pptx":
            ref = f"[PPTX: {source_label}, Slide {chunk.get('slide', '?')}]"
        elif source_type == "youtube":
            ref = f"[Video: {chunk.get('timestamp', '?')}]"
        elif source_type == "url":
            ref = f"[Web: {source_label}]"
        else:
            ref = f"[{source_label}]"

        context_parts.append(f"{ref}\n{chunk['text']}")

    return "\n\n---\n\n".join(context_parts)


async def answer_question(
    session_id: str,
    question: str,
    history: Optional[List[dict]] = None,
    top_k: int = 5,
) -> AsyncGenerator[str, None]:
    """
    Retrieve relevant chunks and stream an answer with source citations.
    """
    # Retrieve relevant chunks
    chunks = query_session(session_id, question, top_k=top_k)

    if not chunks:
        yield "I couldn't find relevant content in the loaded materials to answer this question. Please make sure you've added sources first."
        return

    context = build_context_from_chunks(chunks)
    system = RAG_SYSTEM_PROMPT.format(context=context)

    async for token in stream_response(question, system_prompt=system, history=history):
        yield token


async def generate_quiz(session_id: str, num_questions: int = 5) -> dict:
    """
    Generate a quiz based on all content in the session.
    Returns structured JSON with questions, options, answers.
    """
    # Sample broadly from the session for quiz generation
    chunks = query_session(session_id, "main topics concepts definitions key ideas", top_k=15)

    if not chunks:
        raise ValueError("No content available to generate quiz from.")

    context = build_context_from_chunks(chunks)
    prompt = f"Generate {num_questions} quiz questions from this content:\n\n{context}"
    system = QUIZ_SYSTEM_PROMPT.format(num_questions=num_questions)

    raw = await generate_structured(f"{system}\n\n{prompt}")
    return parse_json_response(raw)
