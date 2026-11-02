from fastapi import HTTPException, UploadFile

from app.core.config import get_settings
from app.services import document_service, llm_service, storage_service
from app.services.llm_service import ask_question

_CHUNK = 1024 * 1024


def _read_limited(file: UploadFile, max_bytes: int) -> bytes:
    """Lê em pedaços e aborta ao passar do limite."""
    buffer = bytearray()
    while chunk := file.file.read(_CHUNK):
        buffer.extend(chunk)
        if len(buffer) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"O arquivo excede o limite de {max_bytes // (1024 * 1024)} MB",
            )
    return bytes(buffer)


def _get_or_404(document_id: str) -> dict:
    document = document_service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    return document


def upload_document(file: UploadFile) -> dict:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="O arquivo deve ser um PDF")

    data = _read_limited(file, get_settings().max_upload_mb * 1024 * 1024)
    if not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="O arquivo não é um PDF válido")

    filename = (file.filename or "documento.pdf").replace("\\", "/").split("/")[-1]
    storage_path = storage_service.build_storage_path()
    storage_service.upload_pdf(data, storage_path)
    try:
        return document_service.save_document(filename, storage_path)
    except Exception:
        # Registro não gravado: não deixa o arquivo órfão no Storage.
        storage_service.remove_pdf(storage_path)
        raise


def list_documents() -> list[dict]:
    return document_service.list_documents()


def ask_document(document_id: str, prompt: str) -> dict:
    document = _get_or_404(document_id)
    pdf_bytes = storage_service.download_pdf(document["storage_path"])
    try:
        return {"resposta": ask_question(pdf_bytes, prompt)}
    except llm_service.EmptyDocumentError:
        raise HTTPException(
            status_code=422,
            detail="Não foi possível ler texto neste PDF (ele pode ser escaneado).",
        )
    except llm_service.LLMTimeoutError:
        raise HTTPException(
            status_code=504, detail="O modelo demorou demais para responder."
        )
    except llm_service.LLMRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Limite de uso do modelo atingido. Tente novamente em instantes.",
        )
    except llm_service.LLMAuthError:
        raise HTTPException(
            status_code=502,
            detail="Chave ou crédito da API da Anthropic inválido.",
        )
    except llm_service.LLMError:
        raise HTTPException(
            status_code=502, detail="Não foi possível falar com o modelo de IA."
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
    # Registro primeiro, arquivo depois: se o Storage falhar sobra só um arquivo órfão.
    document_service.delete_document(document_id)
    try:
        storage_service.remove_pdf(document["storage_path"])
    except Exception:
        pass
