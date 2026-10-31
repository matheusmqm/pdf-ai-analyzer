from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile

from app.controllers import document_controller
from app.dependencies import CurrentUser, get_current_user
from app.models.document_model import AskOut, AskRequest, DocumentOut, DocumentUrlOut

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentOut)
def upload(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
):
    return document_controller.upload_document(current_user, file)


@router.get("/", response_model=list[DocumentOut])
def list_my_documents(current_user: CurrentUser = Depends(get_current_user)):
    return document_controller.list_documents(current_user)


@router.get("/{document_id}/download", response_model=DocumentUrlOut)
def download(
    document_id: UUID,
    inline: bool = False,
    current_user: CurrentUser = Depends(get_current_user),
):
    # `inline=true` devolve um link para visualizar o PDF na página; sem ele, para baixar.
    return document_controller.get_document_url(
        current_user, str(document_id), download=not inline
    )


@router.post("/ask", response_model=AskOut)
def ask(data: AskRequest, current_user: CurrentUser = Depends(get_current_user)):
    return document_controller.ask_document(
        current_user, str(data.document_id), data.prompt
    )
