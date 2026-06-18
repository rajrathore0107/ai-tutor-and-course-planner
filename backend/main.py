from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from config import settings
from routers import task1, task2
from services.shared.supabase_client import init_supabase
from services.shared.embedding_service import init_embedding_model

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize shared services once on startup."""
    logger.info("🚀 Starting EduAssist backend...")

    # Init shared Supabase client
    await init_supabase()
    logger.info("✅ Supabase connected")

    # Load embedding model once (shared across both tasks)
    init_embedding_model()
    logger.info("✅ Embedding model loaded")

    logger.info("🎯 EduAssist backend ready")
    yield

    logger.info("🛑 Shutting down...")


app = FastAPI(
    title="EduAssist API",
    description="Multi-Source AI Learning Assistant + AI Course Planning Assistant",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow both frontend dev servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(task1.router, prefix="/api/task1", tags=["Task 1 — Learning Assistant"])
app.include_router(task2.router, prefix="/api/task2", tags=["Task 2 — Course Planner"])


@app.get("/")
async def root():
    return {
        "status": "ok",
        "app": "EduAssist API",
        "tasks": {
            "task1": "/api/task1",
            "task2": "/api/task2",
        },
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
