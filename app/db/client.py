from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache
def get_client() -> Client:
    """Supabase client using the service role (Postgres and Storage).

    Since there is a single user and no login, the backend is the only thing that
    accesses Supabase; the tables and the bucket have no public policies.
    """
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key.get_secret_value(),
    )
