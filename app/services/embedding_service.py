"""Ollama client (POST /api/embed) to generate embeddings locally."""

import time

import httpx

from app.core.config import get_settings

_RETRIES = 3


class EmbeddingError(Exception):
    pass


def _embed_batch(client: httpx.Client, texts: list[str]) -> list[list[float]]:
    settings = get_settings()
    last: Exception | None = None
    for attempt in range(_RETRIES):
        try:
            response = client.post(
                "/api/embed", json={"model": settings.embedding_model, "input": texts}
            )
            response.raise_for_status()
            embeddings = response.json()["embeddings"]
            if len(embeddings) != len(texts):
                raise EmbeddingError("Ollama returned an unexpected number of embeddings.")
            for vector in embeddings:
                if len(vector) != settings.embedding_dim:
                    raise EmbeddingError(
                        f"The model returned {len(vector)} dimensions; "
                        f"expected {settings.embedding_dim}."
                    )
            return embeddings
        except EmbeddingError:
            raise
        except (httpx.HTTPError, KeyError, ValueError) as e:
            last = e
            time.sleep(2**attempt * 0.5)
    raise EmbeddingError(
        "Could not generate embeddings. Is Ollama running and has the model "
        f"'{settings.embedding_model}' been pulled (ollama pull)?"
    ) from last


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embeds in batches, in the same order as `texts`."""
    settings = get_settings()
    result: list[list[float]] = []
    with httpx.Client(
        base_url=settings.ollama_base_url, timeout=settings.embedding_timeout_seconds
    ) as client:
        size = settings.embedding_batch_size
        for start in range(0, len(texts), size):
            result.extend(_embed_batch(client, texts[start : start + size]))
    return result


def embed_query(text: str) -> list[float]:
    return embed_texts([text])[0]
