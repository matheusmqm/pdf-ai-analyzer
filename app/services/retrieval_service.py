from app.core.config import get_settings
from app.db import vector_store
from app.services import embedding_service


def retrieve(question: str) -> list[dict]:
    """Top-k chunks closest to the question (only from `ready` documents)."""
    embedding = embedding_service.embed_query(question)
    return vector_store.match_chunks(embedding, get_settings().top_k)
