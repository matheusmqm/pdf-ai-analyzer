from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routes import document_routes
from app.services import document_service

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Ingestion runs in-process in the background: anything left half-done will never finish.
    document_service.fail_interrupted()
    yield


app = FastAPI(title="SecondMind", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().frontend_url],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(document_routes.router)
app.include_router(document_routes.ask_router)
