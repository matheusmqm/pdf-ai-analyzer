from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

FileType = Literal["pdf", "xlsx", "csv"]


class DocumentOut(BaseModel):
    id: UUID
    filename: str
    file_type: FileType = "pdf"
    status: str = "pending"  # pending | processing | ready | failed
    error: str | None = None
    page_count: int | None = None  # PDF only
    sheet_count: int | None = None  # spreadsheets only
    row_count: int | None = None  # spreadsheets only
    created_at: datetime | None = None


class AskRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)


class SourceOut(BaseModel):
    ref: int
    document_id: UUID
    filename: str
    kind: Literal["pdf", "sheet"] = "pdf"
    page_start: int | None = None
    page_end: int | None = None
    sheet_name: str | None = None
    sql: str | None = None  # query that produced the numbers (sheet sources)


class TraceStep(BaseModel):
    tool: str
    input: dict[str, Any] = {}
    summary: str
    error: bool = False


class UsageOut(BaseModel):
    steps: int  # calls made to the model
    input_tokens: int
    output_tokens: int
    cost_usd: float


class AskOut(BaseModel):
    answer: str
    sources: list[SourceOut] = []
    trace: list[TraceStep] = []  # empty on the simple (PDF-only) path
    usage: UsageOut | None = None


class DocumentUrlOut(BaseModel):
    url: str
    filename: str


class SheetPreview(BaseModel):
    name: str
    columns: list[str]
    rows: list[list[Any]]
    total_rows: int


class PreviewOut(BaseModel):
    filename: str
    sheets: list[SheetPreview]
