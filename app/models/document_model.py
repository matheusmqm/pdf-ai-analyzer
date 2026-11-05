from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DocumentOut(BaseModel):
    id: UUID
    filename: str
    status: str = "pending"  # pending | processing | ready | failed
    error: str | None = None
    page_count: int | None = None
    created_at: datetime | None = None


class AskRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)


class SourceOut(BaseModel):
    ref: int
    document_id: UUID
    filename: str
    page_start: int
    page_end: int


class AskOut(BaseModel):
    answer: str
    sources: list[SourceOut] = []


class DocumentUrlOut(BaseModel):
    url: str
    filename: str
