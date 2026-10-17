from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, RequireTeacher
from app.db.session import get_db
from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentUpdate,
    AssessmentResponse,
    AssessmentDetailResponse,
)
from app.services import assessment_service

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.get("/", response_model=List[AssessmentResponse])
async def list_assessments(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    return await assessment_service.list_assessments(db, current_user)


@router.get("/{assessment_id}", response_model=AssessmentDetailResponse)
async def get_assessment(
    assessment_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    return await assessment_service.get_assessment(db, assessment_id, current_user)


@router.post("/", response_model=AssessmentDetailResponse, status_code=201)
async def create_assessment(
    req: AssessmentCreate,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    return await assessment_service.create_assessment(db, current_user.id, req)


@router.patch("/{assessment_id}", response_model=AssessmentDetailResponse)
async def update_assessment(
    assessment_id: str,
    req: AssessmentUpdate,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    return await assessment_service.update_assessment(db, assessment_id, req, current_user)


@router.delete("/{assessment_id}", status_code=204)
async def delete_assessment(
    assessment_id: str,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    await assessment_service.delete_assessment(db, assessment_id, current_user)


@router.post("/{assessment_id}/publish", response_model=AssessmentResponse)
async def publish_assessment(
    assessment_id: str,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    return await assessment_service.publish_assessment(db, assessment_id, current_user)


@router.post("/{assessment_id}/archive", response_model=AssessmentResponse)
async def archive_assessment(
    assessment_id: str,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    return await assessment_service.archive_assessment(db, assessment_id, current_user)


@router.post("/{assessment_id}/duplicate", response_model=AssessmentDetailResponse)
async def duplicate_assessment(
    assessment_id: str,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    return await assessment_service.duplicate_assessment(db, assessment_id, current_user)
