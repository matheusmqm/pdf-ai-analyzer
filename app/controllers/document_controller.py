import hashlib

from fastapi import BackgroundTasks, HTTPException, UploadFile

from app.core.config import get_settings
from app.services import (
    agent_service,
    document_service,
    embedding_service,
    ingestion_service,
    llm_service,
    retrieval_service,
    spreadsheet_service,
    storage_service,
)

_CHUNK = 1024 * 1024


def _read_limited(file: UploadFile, max_bytes: int) -> bytes:
    """Reads in pieces and aborts when the limit is exceeded."""
    buffer = bytearray()
    while chunk := file.file.read(_CHUNK):
        buffer.extend(chunk)
        if len(buffer) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"The file exceeds the {max_bytes // (1024 * 1024)} MB limit",
            )
    return bytes(buffer)


def _get_or_404(document_id: str) -> dict:
    document = document_service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


_SUPPORTED = ("pdf", "xlsx", "csv")
_UNSUPPORTED = "Unsupported file. Send a PDF, an Excel (.xlsx) or a CSV file."


def _extension(filename: str | None) -> str:
    name = (filename or "").replace("\\", "/").split("/")[-1]
    return name.rsplit(".", 1)[-1].lower() if "." in name else ""


def _check_content(file_type: str, data: bytes) -> None:
    """Validates the real content, not only the name/Content-Type sent by the browser."""
    if file_type == "pdf" and not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="The file is not a valid PDF")
    if file_type == "xlsx" and not data.startswith(b"PK\x03\x04"):
        raise HTTPException(
            status_code=400, detail="The file is not a valid .xlsx (old .xls is not supported)"
        )
    if file_type == "csv" and (not data.strip() or b"\x00" in data[:4096]):
        raise HTTPException(status_code=400, detail="The file is not a valid CSV")


def upload_document(file: UploadFile, background_tasks: BackgroundTasks) -> dict:
    file_type = _extension(file.filename)
    if file_type not in _SUPPORTED:
        raise HTTPException(status_code=400, detail=_UNSUPPORTED)

    data = _read_limited(file, get_settings().max_upload_mb * 1024 * 1024)
    _check_content(file_type, data)

    content_hash = hashlib.sha256(data).hexdigest()
    if document_service.find_by_hash(content_hash):
        raise HTTPException(status_code=409, detail="This file has already been uploaded.")

    filename = (file.filename or f"document.{file_type}").replace("\\", "/").split("/")[-1]
    storage_path = storage_service.build_storage_path(file_type)
    storage_service.upload_file(data, storage_path, file_type)
    try:
        document = document_service.save_document(
            filename, storage_path, content_hash, file_type
        )
    except Exception:
        # Record not saved: do not leave an orphaned file in Storage.
        storage_service.remove_file(storage_path)
        raise
    background_tasks.add_task(ingestion_service.ingest_document, document["id"])
    return document


def list_documents() -> list[dict]:
    return document_service.list_documents()


def ask(prompt: str) -> dict:
    try:
        routed = retrieval_service.retrieve_routed(prompt)
        if routed.sheets:
            # A spreadsheet looks relevant: agent (search + SQL) over those spreadsheets only.
            files = ", ".join(sorted(set(routed.sheets.values())))
            return agent_service.ask(
                prompt,
                document_ids=set(routed.sheets),
                route_note=f"A spreadsheet matched the question: {files}",
            )
        # No spreadsheet reached the similarity threshold: PDFs only, no agent.
        answer, sources = llm_service.ask_question(prompt, routed.chunks)
        return {"answer": answer, "sources": sources}
    except embedding_service.EmbeddingError:
        raise HTTPException(
            status_code=503,
            detail="Could not search the documents. Is Ollama running?",
        )
    except llm_service.LLMTimeoutError:
        raise HTTPException(
            status_code=504, detail="The model took too long to answer."
        )
    except llm_service.LLMRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Model rate limit reached. Try again in a moment.",
        )
    except llm_service.LLMAuthError:
        raise HTTPException(
            status_code=502,
            detail="Invalid Anthropic API key or insufficient credit.",
        )
    except llm_service.LLMError:
        raise HTTPException(
            status_code=502, detail="Could not reach the AI model."
        )


def get_preview(document_id: str) -> dict:
    document = _get_or_404(document_id)
    if document.get("file_type", "pdf") == "pdf":
        raise HTTPException(status_code=400, detail="Preview is only available for spreadsheets")
    if document["status"] != "ready":
        raise HTTPException(status_code=409, detail="The file is not ready yet")
    data = storage_service.download_file(document["storage_path"])
    try:
        sheets = spreadsheet_service.preview(data, document["file_type"], document["filename"])
    except spreadsheet_service.SpreadsheetError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return {"filename": document["filename"], "sheets": sheets}


def get_document_url(document_id: str, download: bool) -> dict:
    document = _get_or_404(document_id)
    filename = document["filename"]
    url = storage_service.create_signed_url(
        document["storage_path"], filename if download else None
    )
    return {"url": url, "filename": filename}


def delete_document(document_id: str) -> None:
    document = _get_or_404(document_id)
    # Record first, file second: if Storage fails, only an orphaned file is left.
    document_service.delete_document(document_id)
    try:
        storage_service.remove_file(document["storage_path"])
    except Exception:
        pass
