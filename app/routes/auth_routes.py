from fastapi import APIRouter

from app.controllers import auth_controller
from app.models.auth_model import OtpRequest, RefreshRequest, SessionOut, VerifyRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/otp")
def request_otp(data: OtpRequest):
    return auth_controller.request_otp(data.email)


@router.post("/verify", response_model=SessionOut)
def verify_otp(data: VerifyRequest):
    return auth_controller.verify_otp(data.email, data.code)


@router.post("/refresh", response_model=SessionOut)
def refresh(data: RefreshRequest):
    return auth_controller.refresh(data.refresh_token)
