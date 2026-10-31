from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/.env, independente do diretório de onde o servidor é iniciado.
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    supabase_url: str
    supabase_anon_key: str
    # Só necessário para projetos Supabase com a chave JWT legada (HS256).
    # Projetos com chaves assimétricas são validados via JWKS.
    supabase_jwt_secret: str | None = None
    supabase_storage_bucket: str = "pdfs"
    # URL do frontend; o link do e-mail de login redireciona para {frontend_url}/auth/callback
    # e é a única origem liberada no CORS.
    frontend_url: str = "http://localhost:5173"
    openrouter_api_key: str
    # ID do modelo no OpenRouter (os gratuitos terminam em ":free").
    openrouter_model: str
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    # Tempo máximo (segundos) esperando o LLM responder.
    llm_timeout_seconds: int = 120
    # Validade do link de download/visualização do PDF.
    download_url_expires_seconds: int = 300


@lru_cache
def get_settings() -> Settings:
    return Settings()
