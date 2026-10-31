from supabase_auth.types import Session

from app.core.config import get_settings
from app.db.client import get_anon_client


def send_otp(email: str) -> None:
    # Cria a conta no primeiro acesso; nos seguintes só envia o código.
    get_anon_client().auth.sign_in_with_otp(
        {
            "email": email,
            "options": {
                "should_create_user": True,
                "email_redirect_to": f"{get_settings().frontend_url}/auth/callback",
            },
        }
    )


def verify_otp(email: str, code: str) -> Session | None:
    response = get_anon_client().auth.verify_otp(
        {"email": email, "token": code, "type": "email"}
    )
    return response.session


def refresh_session(refresh_token: str) -> Session | None:
    return get_anon_client().auth.refresh_session(refresh_token).session
