from uuid import UUID

from fastapi import APIRouter, File, Response, UploadFile, status

from app.controllers import document_controller
from app.models.document_model import AskOut, AskRequest, DocumentOut, DocumentUrlOut

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentOut)
def upload(file: UploadFile = File(...)):
    return document_controller.upload_document(file)


@router.get("/", response_model=list[DocumentOut])
def list_documents():
    return document_controller.list_documents()


@router.get("/{document_id}/download", response_model=DocumentUrlOut)
def download(document_id: UUID, inline: bool = False):
    # `inline=true` devolve um link para visualizar o PDF na página; sem ele, para baixar.
    return document_controller.get_document_url(str(document_id), download=not inline)


@router.post("/ask", response_model=AskOut)
def ask(data: AskRequest):
    return document_controller.ask_document(str(data.document_id), data.prompt)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(document_id: UUID):
    document_controller.delete_document(str(document_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
