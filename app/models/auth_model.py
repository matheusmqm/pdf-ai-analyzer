from pydantic import BaseModel, EmailStr, Field


class OtpRequest(BaseModel):
    email: EmailStr


class VerifyRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=10)


class RefreshRequest(BaseModel):
    refresh_token: str


class SessionOut(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "bearer"
