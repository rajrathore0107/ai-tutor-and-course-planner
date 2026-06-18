import chromadb
from chromadb.config import Settings as ChromaSettings
from services.shared.embedding_service import embed_texts, embed_query
from typing import List, Dict, Any
import uuid
import logging

logger = logging.getLogger(__name__)

# In-memory Chroma client (no persistence needed — sessions are ephemeral)
_chroma_client = chromadb.Client(ChromaSettings(anonymized_telemetry=False))

# session_id -> ChromaDB collection
_session_collections: Dict[str, Any] = {}


def get_or_create_collection(session_id: str):
    """Get or create a ChromaDB collection for a session."""
    if session_id not in _session_collections:
        collection = _chroma_client.create_collection(
            name=f"session_{session_id.replace('-', '_')}",
            metadata={"hnsw:space": "cosine"},
        )
        _session_collections[session_id] = collection
        logger.info(f"Created collection for session {session_id}")
    return _session_collections[session_id]


def add_chunks_to_session(session_id: str, chunks: List[dict]) -> int:
    """
    Add processed chunks to a session's vector store.
    Each chunk: {text, source_type, source_id, source_label, chunk_index, ...metadata}
    Returns number of chunks added.
    """
    if not chunks:
        return 0

    collection = get_or_create_collection(session_id)

    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts)

    ids = [str(uuid.uuid4()) for _ in chunks]
    metadatas = []
    for chunk in chunks:
        meta = {k: str(v) for k, v in chunk.items() if k != "text"}
        metadatas.append(meta)

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
    )

    logger.info(f"Added {len(chunks)} chunks to session {session_id}")
    return len(chunks)


def query_session(
    session_id: str,
    query: str,
    top_k: int = 5,
    source_filter: str = None,
) -> List[dict]:
    """
    Retrieve top-k relevant chunks for a query from a session.
    Returns list of {text, score, source_type, source_label, ...metadata}
    """
    if session_id not in _session_collections:
        return []

    collection = _session_collections[session_id]
    query_embedding = embed_query(query)

    where = {"source_type": source_filter} if source_filter else None

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    if not results["documents"] or not results["documents"][0]:
        return []

    retrieved = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        retrieved.append({
            "text": doc,
            "score": 1 - dist,  # Convert cosine distance to similarity
            **meta,
        })

    return retrieved


def delete_session(session_id: str):
    """Clean up a session's collection."""
    if session_id in _session_collections:
        _chroma_client.delete_collection(f"session_{session_id.replace('-', '_')}")
        del _session_collections[session_id]
        logger.info(f"Deleted collection for session {session_id}")


def get_session_source_count(session_id: str) -> int:
    """Get total chunk count for a session."""
    if session_id not in _session_collections:
        return 0
    return _session_collections[session_id].count()
