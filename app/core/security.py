import jwt
from jwt import PyJWKClient

from app.core.config import get_settings

# Tokens do Supabase têm audience "authenticated".
_AUDIENCE = "authenticated"
_jwks_client: PyJWKClient | None = None


class InvalidTokenError(Exception):
    pass


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        url = f"{get_settings().supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(url, cache_keys=True)
    return _jwks_client


def decode_supabase_token(token: str) -> dict:
    """Valida a assinatura e a expiração do JWT emitido pelo Supabase Auth."""
    settings = get_settings()
    try:
        alg = jwt.get_unverified_header(token).get("alg")
        if alg == "HS256":
            if not settings.supabase_jwt_secret:
                raise InvalidTokenError("SUPABASE_JWT_SECRET não configurado")
            key = settings.supabase_jwt_secret
        else:
            key = _get_jwks_client().get_signing_key_from_jwt(token).key
        return jwt.decode(token, key, algorithms=[alg], audience=_AUDIENCE)
    except jwt.PyJWTError as e:
        raise InvalidTokenError(str(e)) from e
