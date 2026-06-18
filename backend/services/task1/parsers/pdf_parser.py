import fitz  # pymupdf
from services.shared.chunker import chunk_by_sections
from typing import List
import logging

logger = logging.getLogger(__name__)


def parse_pdf(file_bytes: bytes, filename: str, source_id: str) -> List[dict]:
    """
    Extract text from PDF page by page, chunk it, and return annotated chunks.
    Each chunk includes: source_type, source_id, source_label, page, filename
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    sections = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text").strip()

        if not text:
            continue

        sections.append({
            "text": text,
            "source_type": "pdf",
            "source_id": source_id,
            "source_label": filename,
            "page": page_num + 1,
            "total_pages": len(doc),
        })

    doc.close()

    if not sections:
        logger.warning(f"No text extracted from PDF: {filename}")
        return []

    chunks = chunk_by_sections(sections)
    logger.info(f"PDF '{filename}': {len(chunks)} chunks from {len(sections)} pages")
    return chunks


def summarize_pdf_metadata(file_bytes: bytes, filename: str) -> dict:
    """Return basic metadata about a PDF for the source badge."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    meta = {
        "filename": filename,
        "pages": len(doc),
        "title": doc.metadata.get("title") or filename,
    }
    doc.close()
    return meta
