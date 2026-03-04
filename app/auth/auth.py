from fastapi import APIRouter, Depends,HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schema import UserRegister, UserLogin, TokenResponse
from app.service.auth_service import register_user, login_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register")
def register(data: UserRegister, db: Session = Depends(get_db)):
    try:
        user = register_user(db, data.email, data.password)
        return {"message": "Usuario criado", "email": user.email}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    try:
        token = login_user(db, data.email, data.password)
        return {"access_token": token}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    