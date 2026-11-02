from app.db.client import get_client

TABLE = "documents"


def save_document(filename: str, storage_path: str) -> dict:
    result = (
        get_client()
        .table(TABLE)
        .insert({"filename": filename, "storage_path": storage_path})
        .execute()
    )
    return result.data[0]


def list_documents() -> list[dict]:
    result = (
        get_client()
        .table(TABLE)
        .select("id, filename, created_at")
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
    get_client().table(TABLE).delete().eq("id", document_id).execute()
