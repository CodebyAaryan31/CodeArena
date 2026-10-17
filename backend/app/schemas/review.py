from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ScoreOverrideRequest(BaseModel):
    attempt_id: str
    new_score: float = Field(..., ge=0)
    reason: str = Field(..., min_length=3, description="Audit reason for manual score change")


class FeedbackRequest(BaseModel):
    attempt_id: str
    feedback: str


class ResultReleaseRequest(BaseModel):
    assessment_id: str
    release: bool = True


class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    action: str
    target_type: str
    target_id: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
