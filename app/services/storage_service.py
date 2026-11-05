from uuid import uuid4

from app.core.config import get_settings
from app.db.client import get_client


def build_storage_path() -> str:
    # The original filename lives only in the database; the Storage key is a UUID.
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
    # With `filename` the link forces a download with that name; without it the
    # browser may display the PDF inline (viewer).
    options = {"download": filename} if filename else None
    result = _bucket().create_signed_url(
        storage_path, get_settings().download_url_expires_seconds, options
    )
    return result.get("signedURL") or result["signedUrl"]
