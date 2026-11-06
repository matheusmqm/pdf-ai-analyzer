"""Ingestion, in the background.

PDF: extract per page, chunk, embed and store.
Spreadsheet (xlsx/csv): one "card" per sheet is embedded and stored, so the search can
find the right spreadsheet. The rows are not embedded; they are queried with SQL later.
"""

import logging

from app.core.config import get_settings
from app.db import vector_store
from app.services import (
    chunking_service,
    document_service,
    embedding_service,
    pdf_service,
    spreadsheet_service,
    storage_service,
)

log = logging.getLogger(__name__)


class NoTextError(Exception):
    pass


def ingest_document(document_id: str) -> None:
    """Never raises: any failure becomes status `failed` + `error`."""
    try:
        document = document_service.get_document(document_id)
        if not document:
            return
        document_service.update_status(document_id, "processing")

        data = storage_service.download_file(document["storage_path"])
        if document.get("file_type", "pdf") == "pdf":
            _ingest_pdf(document_id, data)
        else:
            _ingest_spreadsheet(document, data)
    except NoTextError:
        _fail(document_id, "The PDF has no extractable text (it may be scanned; there is no OCR).")
    except spreadsheet_service.SpreadsheetError as e:
        _fail(document_id, str(e))
    except embedding_service.EmbeddingError as e:
        _fail(document_id, str(e))
    except Exception:
        log.exception("Failed to process document %s", document_id)
        _fail(document_id, "Unexpected error while processing the file.")


def _ingest_pdf(document_id: str, pdf_bytes: bytes) -> None:
    settings = get_settings()
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


def _ingest_spreadsheet(document: dict, data: bytes) -> None:
    document_id = document["id"]
    tables = spreadsheet_service.parse(data, document["file_type"], document["filename"])
    chunks = [
        chunking_service.Chunk(
            index=i,
            page_start=None,
            page_end=None,
            content=spreadsheet_service.build_card(document["filename"], table),
            sheet_name=table.sheet,
        )
        for i, table in enumerate(tables)
    ]
    embeddings = embedding_service.embed_texts([c.content for c in chunks])

    vector_store.insert_chunks(document_id, chunks, embeddings)
    document_service.update_status(
        document_id,
        "ready",
        sheet_count=len(tables),
        row_count=sum(len(t.df) for t in tables),
    )


def _fail(document_id: str, message: str) -> None:
    try:
        vector_store.delete_chunks(document_id)
        document_service.update_status(document_id, "failed", error=message)
    except Exception:
        log.exception("Could not mark %s as failed", document_id)
