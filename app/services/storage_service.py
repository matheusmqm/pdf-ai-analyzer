from uuid import uuid4

from supabase import Client

from app.core.config import get_settings


def build_storage_path(user_id: str) -> str:
    # A pasta com o id do usuário é o que as políticas do Storage validam.
    # O nome original do arquivo fica só no banco.
    return f"{user_id}/{uuid4()}.pdf"


def upload_pdf(client: Client, file_bytes: bytes, storage_path: str) -> str:
    bucket = get_settings().supabase_storage_bucket
    client.storage.from_(bucket).upload(
        storage_path, file_bytes, {"content-type": "application/pdf"}
    )
    return storage_path


def download_pdf(client: Client, storage_path: str) -> bytes:
    bucket = get_settings().supabase_storage_bucket
    return client.storage.from_(bucket).download(storage_path)


def create_signed_url(
    client: Client, storage_path: str, filename: str | None = None
) -> str:
    # Com `filename` o link força o download com esse nome; sem ele o navegador
    # pode exibir o PDF inline (visualizador).
    settings = get_settings()
    options = {"download": filename} if filename else None
    result = client.storage.from_(settings.supabase_storage_bucket).create_signed_url(
        storage_path, settings.download_url_expires_seconds, options
    )
    return result.get("signedURL") or result["signedUrl"]

