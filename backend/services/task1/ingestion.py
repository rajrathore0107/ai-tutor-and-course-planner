from services.task1.parsers.pdf_parser import parse_pdf, summarize_pdf_metadata
from services.task1.parsers.pptx_parser import parse_pptx, summarize_pptx_metadata
from services.task1.parsers.url_parser import parse_url
from services.task1.parsers.youtube_parser import parse_youtube, get_video_metadata
from services.task1.vector_store import add_chunks_to_session
from services.shared.llm_client import generate_structured
import uuid
import logging

logger = logging.getLogger(__name__)

SOURCE_SUMMARY_PROMPT = """You are a concise academic summarizer.
Summarize the following content in 3-4 sentences, capturing the main topic, key points, and scope.
Be specific and informative — not vague.

Content:
{text_sample}

Return only the summary paragraph, no preamble."""


async def ingest_pdf(session_id: str, file_bytes: bytes, filename: str) -> dict:
    source_id = str(uuid.uuid4())
    chunks = parse_pdf(file_bytes, filename, source_id)
    count = add_chunks_to_session(session_id, chunks)

    # Generate summary from first ~2000 chars of content
    sample = " ".join(c["text"] for c in chunks[:5])[:2000]
    summary = await generate_structured(SOURCE_SUMMARY_PROMPT.format(text_sample=sample))

    meta = summarize_pdf_metadata(file_bytes, filename)

    return {
        "source_id": source_id,
        "source_type": "pdf",
        "label": filename,
        "chunks_indexed": count,
        "summary": summary.strip(),
        **meta,
    }


async def ingest_pptx(session_id: str, file_bytes: bytes, filename: str) -> dict:
    source_id = str(uuid.uuid4())
    chunks = parse_pptx(file_bytes, filename, source_id)
    count = add_chunks_to_session(session_id, chunks)

    sample = " ".join(c["text"] for c in chunks[:5])[:2000]
    summary = await generate_structured(SOURCE_SUMMARY_PROMPT.format(text_sample=sample))

    meta = summarize_pptx_metadata(file_bytes, filename)

    return {
        "source_id": source_id,
        "source_type": "pptx",
        "label": filename,
        "chunks_indexed": count,
        "summary": summary.strip(),
        **meta,
    }


async def ingest_url(session_id: str, url: str) -> dict:
    source_id = str(uuid.uuid4())
    chunks = await parse_url(url, source_id)
    count = add_chunks_to_session(session_id, chunks)

    sample = " ".join(c["text"] for c in chunks[:5])[:2000]
    summary = await generate_structured(SOURCE_SUMMARY_PROMPT.format(text_sample=sample))

    label = chunks[0].get("source_label", url) if chunks else url

    return {
        "source_id": source_id,
        "source_type": "url",
        "label": label,
        "url": url,
        "chunks_indexed": count,
        "summary": summary.strip(),
    }


async def ingest_youtube(session_id: str, url: str) -> dict:
    source_id = str(uuid.uuid4())
    chunks = await parse_youtube(url, source_id)
    count = add_chunks_to_session(session_id, chunks)

    sample = " ".join(c["text"] for c in chunks[:5])[:2000]
    summary = await generate_structured(SOURCE_SUMMARY_PROMPT.format(text_sample=sample))

    meta = get_video_metadata(url)

    return {
        "source_id": source_id,
        "source_type": "youtube",
        "label": f"YouTube: {meta['video_id']}",
        "chunks_indexed": count,
        "summary": summary.strip(),
        **meta,
    }
