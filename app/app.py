from fastapi import FastAPI
from app.auth.auth import router as auth_router
from app.document import router as documents_router

app = FastAPI()

app.include_router(auth_router)
app.include_router(documents_router)