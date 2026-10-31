from supabase import Client

TABLE = "documents"


def save_document(client: Client, user_id: str, filename: str, storage_path: str) -> dict:
    result = client.table(TABLE).insert({
        "user_id": user_id,
        "filename": filename,
        "storage_path": storage_path,
    }).execute()
    return result.data[0]


def list_documents(client: Client) -> list[dict]:
    result = (
        client.table(TABLE)
        .select("id, filename, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


def get_document(client: Client, document_id: str) -> dict | None:
    # A RLS já restringe ao dono do documento.
    result = client.table(TABLE).select("*").eq("id", document_id).limit(1).execute()
    return result.data[0] if result.data else None
