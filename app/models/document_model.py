from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: UUID
    filename: str
    created_at: datetime | None = None


class AskRequest(BaseModel):
    document_id: UUID
    prompt: str


class AskOut(BaseModel):
    resposta: str


class DocumentUrlOut(BaseModel):
    url: str
    filename: str
