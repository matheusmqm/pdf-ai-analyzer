"""Ingestion: extract per page, chunk, embed and store. Runs in the background."""

import logging

from app.core.config import get_settings
from app.db import vector_store
from app.services import (
    chunking_service,
    document_service,
    embedding_service,
    pdf_service,
    storage_service,
)

log = logging.getLogger(__name__)


class NoTextError(Exception):
    pass


def ingest_document(document_id: str) -> None:
    """Never raises: any failure becomes status `failed` + `error`."""
    settings = get_settings()
    try:
        document = document_service.get_document(document_id)
        if not document:
            return
        document_service.update_status(document_id, "processing")

        pdf_bytes = storage_service.download_pdf(document["storage_path"])
        pages = pdf_service.extract_pages(pdf_bytes)
        if not pages:
            raise NoTextError
        chunks = chunking_service.chunk_pages(
            pages, settings.chunk_size, settings.chunk_overlap
        )
        embeddings = embedding_service.embed_texts([c.content for c in chunks])

        vector_store.insert_chunks(document_id, chunks, embeddings)
        document_service.update_status(
            document_id, "ready", page_count=pdf_service.count_pages(pdf_bytes)
        )
    except NoTextError:
        _fail(document_id, "The PDF has no extractable text (it may be scanned; there is no OCR).")
    except embedding_service.EmbeddingError as e:
        _fail(document_id, str(e))
    except Exception:
        log.exception("Failed to process document %s", document_id)
        _fail(document_id, "Unexpected error while processing the PDF.")


def _fail(document_id: str, message: str) -> None:
    try:
        vector_store.delete_chunks(document_id)
        document_service.update_status(document_id, "failed", error=message)
    except Exception:
        log.exception("Could not mark %s as failed", document_id)
