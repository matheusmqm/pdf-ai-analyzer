from uuid import uuid4

from app.core.config import get_settings
from app.db.client import get_client


def build_storage_path() -> str:
    # O nome original do arquivo fica só no banco; a chave do Storage é um UUID.
    return f"{uuid4()}.pdf"


def _bucket():
    return get_client().storage.from_(get_settings().supabase_storage_bucket)


def upload_pdf(file_bytes: bytes, storage_path: str) -> str:
    _bucket().upload(storage_path, file_bytes, {"content-type": "application/pdf"})
    return storage_path


def download_pdf(storage_path: str) -> bytes:
    return _bucket().download(storage_path)


def remove_pdf(storage_path: str) -> None:
    _bucket().remove([storage_path])


def create_signed_url(storage_path: str, filename: str | None = None) -> str:
    # Com `filename` o link força o download com esse nome; sem ele o navegador
    # pode exibir o PDF inline (visualizador).
    options = {"download": filename} if filename else None
    result = _bucket().create_signed_url(
        storage_path, get_settings().download_url_expires_seconds, options
    )
    return result.get("signedURL") or result["signedUrl"]
