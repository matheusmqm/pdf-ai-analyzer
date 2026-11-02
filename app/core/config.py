from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# .env na raiz do projeto, independente do diretório de onde o servidor é iniciado.
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    # Supabase só como Postgres + Storage. Não há login: um único usuário.
    supabase_url: str
    # Ignora o RLS: só no backend, nunca no frontend nem em logs.
    supabase_service_role_key: SecretStr
    supabase_storage_bucket: str = "pdfs"

    # Única origem liberada no CORS. A API NÃO tem autenticação: rode só localmente.
    frontend_url: str = "http://localhost:5173"

    # Claude API (console.anthropic.com/settings/keys).
    anthropic_api_key: SecretStr
    anthropic_model: str = "claude-haiku-5-5"
    # Esforço de raciocínio (menos = mais rápido e barato).
    anthropic_effort: str = "low"
    max_output_tokens: int = 2048
    # Tempo máximo (segundos) esperando o LLM responder.
    llm_timeout_seconds: int = 120

    # Limite de upload (MB) e validade do link de download/visualização do PDF.
    max_upload_mb: int = 20
    download_url_expires_seconds: int = 300


@lru_cache
def get_settings() -> Settings:
    return Settings()
