import hashlib

from fastapi import BackgroundTasks, HTTPException, UploadFile

from app.core.config import get_settings
from app.services import (
    document_service,
    embedding_service,
    ingestion_service,
    llm_service,
    retrieval_service,
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


def upload_document(file: UploadFile, background_tasks: BackgroundTasks) -> dict:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="The file must be a PDF")

    data = _read_limited(file, get_settings().max_upload_mb * 1024 * 1024)
    if not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="The file is not a valid PDF")

    content_hash = hashlib.sha256(data).hexdigest()
    if document_service.find_by_hash(content_hash):
        raise HTTPException(status_code=409, detail="This PDF has already been uploaded.")

    filename = (file.filename or "document.pdf").replace("\\", "/").split("/")[-1]
    storage_path = storage_service.build_storage_path()
    storage_service.upload_pdf(data, storage_path)
    try:
        document = document_service.save_document(filename, storage_path, content_hash)
    except Exception:
        # Record not saved: do not leave an orphaned file in Storage.
        storage_service.remove_pdf(storage_path)
        raise
    background_tasks.add_task(ingestion_service.ingest_document, document["id"])
    return document


def list_documents() -> list[dict]:
    return document_service.list_documents()


def ask(prompt: str) -> dict:
    try:
        chunks = retrieval_service.retrieve(prompt)
        answer, sources = llm_service.ask_question(prompt, chunks)
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
        storage_service.remove_pdf(document["storage_path"])
    except Exception:
        pass
