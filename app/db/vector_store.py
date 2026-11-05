from app.core.config import get_settings
from app.db.client import get_client

TABLE = "chunks"
_INSERT_BATCH = 50


def insert_chunks(document_id: str, chunks: list, embeddings: list[list[float]]) -> None:
    model = get_settings().embedding_model
    rows = [
        {
            "document_id": document_id,
            "chunk_index": chunk.index,
            "page_start": chunk.page_start,
            "page_end": chunk.page_end,
            "content": chunk.content,
            "embedding": embedding,
            "embedding_model": model,
        }
        for chunk, embedding in zip(chunks, embeddings, strict=True)
    ]
    for start in range(0, len(rows), _INSERT_BATCH):
        get_client().table(TABLE).insert(rows[start : start + _INSERT_BATCH]).execute()


def delete_chunks(document_id: str) -> None:
    get_client().table(TABLE).delete().eq("document_id", document_id).execute()


def match_chunks(query_embedding: list[float], k: int) -> list[dict]:
    result = (
        get_client()
        .rpc("match_chunks", {"query_embedding": query_embedding, "k": k})
        .execute()
    )
    return result.data
