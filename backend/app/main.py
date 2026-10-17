"""
FastAPI application entry point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import engine, Base

# Import all models so Alembic/SQLAlchemy can see them
import app.db.models  # noqa: F401

from app.api import (
    auth,
    users,
    assessments,
    questions,
    coding_problems,
    attempts,
    submissions,
    reviews,
    analytics,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (dev only; production uses Alembic migrations)
    if settings.ENVIRONMENT == "development":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="CODEARENA API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(assessments.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(coding_problems.router, prefix="/api")
app.include_router(attempts.router, prefix="/api")
app.include_router(submissions.router, prefix="/api")
app.include_router(reviews.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "codearena-api"}
