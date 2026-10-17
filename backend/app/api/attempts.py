from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.schemas.attempt import (
    AnswerSaveRequest,
    AttemptAnswerResponse,
    AttemptResponse,
    AttemptDetailResponse,
    IntegrityEventCreate,
    IntegrityEventResponse,
)
from app.services import attempt_service

router = APIRouter(prefix="/attempts", tags=["attempts"])


class StartAttemptRequest(BaseModel):
    assessment_id: str


@router.get("/", response_model=List[AttemptResponse])
async def list_attempts(
    current_user: CurrentUser,
    assessment_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    return await attempt_service.list_user_attempts(db, current_user, assessment_id)


@router.post("/", response_model=AttemptDetailResponse, status_code=201)
async def start_attempt(
    req: StartAttemptRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    return await attempt_service.start_or_resume_attempt(db, req.assessment_id, current_user)



@router.get("/{attempt_id}", response_model=AttemptDetailResponse)
async def get_attempt(
    attempt_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    return await attempt_service.get_attempt_detail(db, attempt_id, current_user)


@router.patch("/{attempt_id}/answers", response_model=AttemptAnswerResponse)
async def save_answer(
    attempt_id: str,
    req: AnswerSaveRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    return await attempt_service.save_answer(db, attempt_id, current_user, req)


@router.post("/{attempt_id}/submit", response_model=AttemptDetailResponse)
async def submit_attempt(
    attempt_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    return await attempt_service.submit_attempt(db, attempt_id, current_user)


@router.post("/{attempt_id}/integrity-events", response_model=IntegrityEventResponse, status_code=201)
async def record_integrity_event(
    attempt_id: str,
    req: IntegrityEventCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    return await attempt_service.record_integrity_event(db, attempt_id, current_user, req)


@router.get("/{attempt_id}/integrity-events")
async def list_integrity_events(
    attempt_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    return await attempt_service.get_integrity_events(db, attempt_id, current_user)

