import logging
from dataclasses import dataclass, field

from app.core.config import get_settings
from app.db import vector_store
from app.services import embedding_service

log = logging.getLogger(__name__)


def retrieve(question: str) -> list[dict]:
    """Top-k chunks closest to the question (only from `ready` documents)."""
    embedding = embedding_service.embed_query(question)
    return vector_store.match_chunks(embedding, get_settings().top_k)


@dataclass
class Routed:
    """Result of the first search, plus which spreadsheets look relevant to the question."""

    # Chunks for the cheap path. Always PDF-only: a spreadsheet that did not reach the
    # similarity threshold is not used at all.
    chunks: list[dict]
    # document_id -> filename of every spreadsheet that looks relevant (empty = no agent).
    sheets: dict[str, str] = field(default_factory=dict)


def retrieve_routed(question: str) -> Routed:
    """One embedding, two searches.

    A spreadsheet is relevant only when one of its cards has cosine similarity >=
    `sheet_min_similarity` with the question, either among the normal top-k chunks or among
    the `sheet_top_k` closest cards (a separate search, because a card is a single chunk
    competing with the many PDF chunks and could be left out of the top-k).
    Below the threshold the spreadsheets are discarded and only the PDFs are used.
    """
    settings = get_settings()
    threshold = settings.sheet_min_similarity
    embedding = embedding_service.embed_query(question)
    chunks = vector_store.match_chunks(embedding, settings.top_k)
    cards = vector_store.match_sheet_chunks(embedding, settings.sheet_top_k)

    candidates = [c for c in chunks if c.get("sheet_name")] + cards
    sheets = {
        c["document_id"]: c["filename"] for c in candidates if c["similarity"] >= threshold
    }

    log.info(
        "Routing: %s | best card similarity: %s (threshold %s) | relevant sheets: %s",
        "agent" if sheets else "simple (PDF only)",
        round(max((c["similarity"] for c in candidates), default=0), 3) if candidates else None,
        threshold,
        list(sheets.values()),
    )
    pdf_chunks = [c for c in chunks if not c.get("sheet_name")]
    return Routed(chunks=pdf_chunks, sheets=sheets)
