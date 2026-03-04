from sqlalchemy.orm import Session
from app.db.models.document import Document
import uuid

def save_document(db: Session, user_id: str, filename: str, storage_path: str) -> Document:
    document = Document(
        user_id=user_id,
        filename=filename,
        storage_path=storage_path
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    return document

def list_documents(db: Session, user_id: str) -> list:
    return db.query(Document).filter(Document.user_id == user_id).all()

def get_document(db: Session, document_id: str, user_id: str) -> Document:
    return db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == user_id
    ).first()