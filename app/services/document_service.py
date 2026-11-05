from app.db.client import get_client

TABLE = "documents"
_PUBLIC = "id, filename, status, error, page_count, created_at"


def save_document(filename: str, storage_path: str, content_hash: str) -> dict:
    result = (
        get_client()
        .table(TABLE)
        .insert(
            {
                "filename": filename,
                "storage_path": storage_path,
                "content_hash": content_hash,
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
) -> None:
    data: dict = {"status": status, "error": error}
    if page_count is not None:
        data["page_count"] = page_count
    get_client().table(TABLE).update(data).eq("id", document_id).execute()


def fail_interrupted() -> None:
    """Ingestions left half-done (server restarted) become `failed`."""
    (
        get_client()
        .table(TABLE)
        .update(
            {
                "status": "failed",
                "error": "Processing was interrupted. Delete the PDF and upload it again.",
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
