from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache
def get_client() -> Client:
    """Cliente Supabase com a service role (Postgres e Storage).

    Como há um único usuário e nenhum login, o backend é o único que acessa o
    Supabase; as tabelas e o bucket não têm políticas públicas.
    """
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key.get_secret_value(),
    )
