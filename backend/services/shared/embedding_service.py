from sentence_transformers import SentenceTransformer
from typing import List
import logging

logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None
MODEL_NAME = "all-MiniLM-L6-v2"  # 80MB, fast, good quality


def init_embedding_model():
    global _model
    logger.info(f"Loading embedding model: {MODEL_NAME}")
    _model = SentenceTransformer(MODEL_NAME)
    logger.info("Embedding model ready")


def get_embedding_model() -> SentenceTransformer:
    if _model is None:
        # Lazy init fallback (e.g. during testing)
        init_embedding_model()
    return _model


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a list of text strings. Returns list of vectors."""
    model = get_embedding_model()
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return embeddings.tolist()


def embed_query(query: str) -> List[float]:
    """Embed a single query string."""
    return embed_texts([query])[0]
