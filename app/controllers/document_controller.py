from fastapi import HTTPException, UploadFile

from app.dependencies import CurrentUser
from app.services import document_service, llm_service, storage_service
from app.services.llm_service import ask_question


def upload_document(user: CurrentUser, file: UploadFile) -> dict:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="O arquivo deve ser um PDF")

    storage_path = storage_service.build_storage_path(user.id)
    storage_service.upload_pdf(user.client, file.file.read(), storage_path)
    return document_service.save_document(
        user.client, user.id, file.filename, storage_path
    )


def list_documents(user: CurrentUser) -> list[dict]:
    return document_service.list_documents(user.client)


def ask_document(user: CurrentUser, document_id: str, prompt: str) -> dict:
    document = document_service.get_document(user.client, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    pdf_bytes = storage_service.download_pdf(user.client, document["storage_path"])
    try:
        return {"resposta": ask_question(pdf_bytes, prompt)}
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
            detail="Chave ou crédito do OpenRouter inválido.",
        )
    except llm_service.LLMError:
        raise HTTPException(
            status_code=502, detail="Não foi possível falar com o modelo de IA."
        )


def get_document_url(user: CurrentUser, document_id: str, download: bool) -> dict:
    document = document_service.get_document(user.client, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    filename = document["filename"]
    url = storage_service.create_signed_url(
        user.client, document["storage_path"], filename if download else None
    )
    return {"url": url, "filename": filename}
