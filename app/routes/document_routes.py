from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, File, Response, UploadFile, status

from app.controllers import document_controller
from app.models.document_model import (
    AskOut,
    AskRequest,
    DocumentOut,
    DocumentUrlOut,
    PreviewOut,
)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentOut)
def upload(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    return document_controller.upload_document(file, background_tasks)


@router.get("/", response_model=list[DocumentOut])
def list_documents():
    return document_controller.list_documents()


@router.get("/{document_id}/download", response_model=DocumentUrlOut)
def download(document_id: UUID, inline: bool = False):
    # `inline=true` returns a link to view the file in the page; without it, to download.
    return document_controller.get_document_url(str(document_id), download=not inline)


@router.get("/{document_id}/preview", response_model=PreviewOut)
def preview(document_id: UUID):
    # First rows of each sheet, for the spreadsheet viewer.
    return document_controller.get_preview(str(document_id))


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(document_id: UUID):
    document_controller.delete_document(str(document_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Question over the whole knowledge base (all ready PDFs and spreadsheets).
ask_router = APIRouter(tags=["ask"])


@ask_router.post("/ask", response_model=AskOut)
def ask(data: AskRequest):
    return document_controller.ask(data.prompt)
