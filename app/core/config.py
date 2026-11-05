from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# .env at the project root, regardless of the directory the server is started from.
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    # Supabase is used only as Postgres + Storage. There is no login: single user.
    supabase_url: str
    # Bypasses RLS: backend only, never in the frontend or in logs.
    supabase_service_role_key: SecretStr
    supabase_storage_bucket: str = "pdfs"

    # Only origin allowed by CORS. The API has NO authentication: run it locally only.
    frontend_url: str = "http://localhost:5173"

    # Claude API (console.anthropic.com/settings/keys).
    anthropic_api_key: SecretStr
    anthropic_model: str = "claude-haiku-5-5"
    # Reasoning effort (lower = faster and cheaper).
    anthropic_effort: str = "low"
    max_output_tokens: int = 2048
    # Maximum time (seconds) to wait for the LLM to answer.
    llm_timeout_seconds: int = 120

    # Local embeddings via Ollama (ollama pull bge-m3). Changing the model/dimension
    # requires adjusting `vector(N)` in schema.sql and re-indexing the PDFs.
    ollama_base_url: str = "http://localhost:11434"
    embedding_model: str = "bge-m3"
    embedding_dim: int = 1024
    embedding_batch_size: int = 16
    embedding_timeout_seconds: int = 120

    # Chunking (approximate tokens: ~4 characters per token) and retrieval.
    chunk_size: int = 600
    chunk_overlap: int = 80
    top_k: int = 8

    # Upload limit (MB) and lifetime of the PDF download/view link.
    max_upload_mb: int = 20
    download_url_expires_seconds: int = 300


@lru_cache
def get_settings() -> Settings:
    return Settings()
