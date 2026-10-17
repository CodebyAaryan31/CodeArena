from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.schemas.submission import (
    QuickRunRequest,
    QuickRunResponse,
    SubmissionCreate,
    SubmissionResponse,
    SubmissionDetailResponse,
)
from app.services import grading_service

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.get("/", response_model=List[SubmissionResponse])
async def list_submissions(
    current_user: CurrentUser,
    attempt_id: Optional[str] = None,
    problem_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    return await grading_service.list_submissions(
        db=db,
        user=current_user,
        attempt_id=attempt_id,
        problem_id=problem_id,
    )



@router.post("/run", response_model=QuickRunResponse)
async def quick_run_tests(
    req: QuickRunRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    return await grading_service.quick_run_sample_tests(db, current_user, req)


@router.post("/", response_model=SubmissionDetailResponse, status_code=201)
async def submit_code(
    req: SubmissionCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    return await grading_service.grade_submission(db, current_user, req)


@router.get("/{submission_id}", response_model=SubmissionDetailResponse)
async def get_submission(
    submission_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    return await grading_service.get_submission_detail(db, submission_id, current_user)
