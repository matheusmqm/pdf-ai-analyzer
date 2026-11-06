from app.db.client import get_client

TABLE = "documents"
_PUBLIC = (
    "id, filename, file_type, status, error, page_count, sheet_count, row_count, created_at"
)


def save_document(
    filename: str, storage_path: str, content_hash: str, file_type: str = "pdf"
) -> dict:
    result = (
        get_client()
        .table(TABLE)
        .insert(
            {
                "filename": filename,
                "storage_path": storage_path,
                "content_hash": content_hash,
                "file_type": file_type,
                "status": "pending",
            }
        )
        .execute()
    )
    return result.data[0]


def find_by_hash(content_hash: str) -> dict | None:
    result = (
        get_client()
        .table(TABLE)
        .select("id")
        .eq("content_hash", content_hash)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def update_status(
    document_id: str,
    status: str,
    error: str | None = None,
    page_count: int | None = None,
    sheet_count: int | None = None,
    row_count: int | None = None,
) -> None:
    data: dict = {"status": status, "error": error}
    if page_count is not None:
        data["page_count"] = page_count
    if sheet_count is not None:
        data["sheet_count"] = sheet_count
    if row_count is not None:
        data["row_count"] = row_count
    get_client().table(TABLE).update(data).eq("id", document_id).execute()


def fail_interrupted() -> None:
    """Ingestions left half-done (server restarted) become `failed`."""
    (
        get_client()
        .table(TABLE)
        .update(
            {
                "status": "failed",
                "error": "Processing was interrupted. Delete the file and upload it again.",
            }
        )
        .in_("status", ["pending", "processing"])
        .execute()
    )


def list_documents() -> list[dict]:
    result = (
        get_client()
        .table(TABLE)
        .select(_PUBLIC)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


def get_document(document_id: str) -> dict | None:
    result = (
        get_client().table(TABLE).select("*").eq("id", document_id).limit(1).execute()
    )
    return result.data[0] if result.data else None


def delete_document(document_id: str) -> None:
    # Chunks are removed too (ON DELETE CASCADE).
    get_client().table(TABLE).delete().eq("id", document_id).execute()


def list_ready_spreadsheets() -> list[dict]:
    """Spreadsheets (xlsx/csv) already processed, oldest first (stable table naming)."""
    result = (
        get_client()
        .table(TABLE)
        .select("id, filename, file_type, storage_path")
        .eq("status", "ready")
        .in_("file_type", ["xlsx", "csv"])
        .order("created_at")
        .execute()
    )
    return result.data
