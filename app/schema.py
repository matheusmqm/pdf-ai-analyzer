from pydantic import BaseModel, EmailStr, field_validator


class Prompt(BaseModel):
    prompt: str


class UserRegister(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    def validate_password(cls, v):
        if len(v) > 72:
            raise ValueError("Senha deve ter no máximo 72 caracteres")
        if len(v) < 6:
            raise ValueError("Senha deve ter no mínimo 6 caracteres")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class AskRequest(BaseModel):
    document_id: str
    prompt: str