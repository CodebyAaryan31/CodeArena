from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import RequireTeacher
from app.db.session import get_db
from app.schemas.review import (
    ScoreOverrideRequest,
    FeedbackRequest,
    ResultReleaseRequest,
    AuditLogResponse,
)
from app.services import review_service

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("/submissions")
async def list_submissions(
    current_user: RequireTeacher,
    assessment_id: Optional[str] = None,
    student_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    return await review_service.list_submissions_for_teacher(
        db=db,
        assessment_id=assessment_id,
        student_id=student_id,
    )


@router.post("/override-score")
async def override_score(
    req: ScoreOverrideRequest,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    return await review_service.override_attempt_score(db, current_user, req)


@router.post("/feedback")
async def add_feedback(
    req: FeedbackRequest,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    return await review_service.add_attempt_feedback(db, current_user, req)


@router.post("/release-results")
async def release_results(
    req: ResultReleaseRequest,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    return await review_service.release_assessment_results(db, current_user, req)


@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    current_user: RequireTeacher,
    target_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    return await review_service.list_audit_logs(db, target_id)
