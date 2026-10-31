from supabase import Client, ClientOptions, create_client

from app.core.config import get_settings


def get_user_client(access_token: str) -> Client:
    """Cliente Supabase que age como o usuário dono do token.

    O token vai no header Authorization (Postgres e Storage), então as
    políticas de RLS definidas em schema.sql valem para cada chamada.
    """
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
        options=ClientOptions(headers={"Authorization": f"Bearer {access_token}"}),
    )


def get_anon_client() -> Client:
    """Cliente sem usuário, usado nos passos de login (enviar e verificar código)."""
    settings = get_settings()
    # "implicit": o link do e-mail devolve os tokens no fragmento da URL. O PKCE exigiria guardar
    # o code_verifier entre o envio e o clique, e esta API não mantém estado.
    return create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
        options=ClientOptions(flow_type="implicit"),
    )
