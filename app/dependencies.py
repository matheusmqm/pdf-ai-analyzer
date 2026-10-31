from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client

from app.core.security import InvalidTokenError, decode_supabase_token
from app.db.client import get_user_client

bearer_scheme = HTTPBearer()


@dataclass
class CurrentUser:
    id: str
    client: Client


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> CurrentUser:
    token = credentials.credentials
    try:
        payload = decode_supabase_token(token)
    except InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido ou expirado")

    return CurrentUser(
        id=payload["sub"],
        client=get_user_client(token),
    )
