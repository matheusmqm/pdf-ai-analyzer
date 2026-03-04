from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models.user import User
from app.core.dependencies import get_current_user
from app.service.storage_service import upload_pdf, download_pdf
from app.service.document_service import save_document, list_documents, get_document
from app.service.llm_service import ask_question
from app.schema import AskRequest
import uuid
import io

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="O arquivo deve ser um PDF")
    
    file_bytes = await file.read()
    storage_path = f"{current_user.id}/{uuid.uuid4()}_{file.filename}"

    upload_pdf(file_bytes, storage_path)
    document = save_document(db, current_user.id, file.filename, storage_path)

    return {"id": document.id, "filename": document.filename}

@router.get("/")
def list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    documents = list_documents(db, current_user.id)
    return [{"id": d.id, "filename": d.filename, "created_at": d.created_at}for d in documents]

@router.post("/ask")
async def ask(
    data: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = get_document(db,data.document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    pdf_bytes = download_pdf(document.storage_path)
    resposta = ask_question(pdf_bytes, data.prompt)

    return {"resposta": resposta}