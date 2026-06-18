from typing import List
import tiktoken
from config import settings

# Use cl100k_base tokenizer (GPT-4 compatible, close enough for chunk sizing)
_tokenizer = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    return len(_tokenizer.encode(text))


def chunk_text(
    text: str,
    chunk_size: int = None,
    chunk_overlap: int = None,
    metadata: dict = None,
) -> List[dict]:
    """
    Split text into overlapping chunks by token count.
    Returns list of dicts: {text, token_count, chunk_index, **metadata}
    """
    chunk_size = chunk_size or settings.chunk_size
    chunk_overlap = chunk_overlap or settings.chunk_overlap
    metadata = metadata or {}

    tokens = _tokenizer.encode(text)
    chunks = []
    start = 0
    chunk_index = 0

    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_text_str = _tokenizer.decode(chunk_tokens)

        if chunk_text_str.strip():
            chunks.append({
                "text": chunk_text_str.strip(),
                "token_count": len(chunk_tokens),
                "chunk_index": chunk_index,
                **metadata,
            })
            chunk_index += 1

        if end == len(tokens):
            break
        start = end - chunk_overlap

    return chunks


def chunk_by_sections(
    sections: List[dict],
    chunk_size: int = None,
    chunk_overlap: int = None,
) -> List[dict]:
    """
    Chunk a list of {text, **metadata} sections.
    Preserves metadata (page number, slide number, timestamp, etc.)
    """
    all_chunks = []
    for section in sections:
        text = section.pop("text", "")
        metadata = section  # remaining keys become metadata
        chunks = chunk_text(text, chunk_size, chunk_overlap, metadata)
        all_chunks.extend(chunks)
    return all_chunks
