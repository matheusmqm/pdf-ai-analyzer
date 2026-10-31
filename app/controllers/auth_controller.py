import logging

from fastapi import HTTPException
from supabase_auth.errors import AuthApiError
from supabase_auth.types import Session

from app.services import auth_service

logger = logging.getLogger(__name__)


def _to_http_error(error: AuthApiError, default_status: int, detail: str) -> HTTPException:
    logger.warning("Supabase Auth recusou (status %s): %s", error.status, error.message)
    if error.status == 429:
        return HTTPException(429, "Muitas tentativas. Aguarde um pouco e tente de novo.")
    return HTTPException(default_status, detail)


def _session_out(session: Session | None, detail: str) -> dict:
    if session is None:
        raise HTTPException(401, detail)
    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "expires_in": session.expires_in,
    }


def request_otp(email: str) -> dict:
    try:
        auth_service.send_otp(email)
    except AuthApiError as e:
        raise _to_http_error(e, 400, "Não foi possível enviar o código")
    # Resposta igual para qualquer e-mail, sem revelar se ele já tem conta.
    return {"message": "Se o e-mail for válido, enviamos um código de acesso."}


def verify_otp(email: str, code: str) -> dict:
    detail = "Código inválido ou expirado"
    try:
        session = auth_service.verify_otp(email, code)
    except AuthApiError as e:
        raise _to_http_error(e, 401, detail)
    return _session_out(session, detail)


def refresh(refresh_token: str) -> dict:
    detail = "Sessão inválida ou expirada"
    try:
        session = auth_service.refresh_session(refresh_token)
    except AuthApiError as e:
        raise _to_http_error(e, 401, detail)
    return _session_out(session, detail)
