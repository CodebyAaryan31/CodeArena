from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, RequireTeacher
from app.db.session import get_db
from app.schemas.analytics import AssessmentAnalyticsResponse, LeaderboardEntry
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/assessments/{assessment_id}", response_model=AssessmentAnalyticsResponse)
async def get_assessment_stats(
    assessment_id: str,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.get_assessment_analytics(db, assessment_id)


@router.get("/leaderboard/{assessment_id}", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    assessment_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.get_assessment_leaderboard(db, assessment_id, current_user)

