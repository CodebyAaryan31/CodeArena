from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from app.db.models.attempt import AttemptStatus
from app.schemas.assessment import AssessmentDetailResponse


class AnswerSaveRequest(BaseModel):
    assessment_question_id: str
    selected_option_ids: Optional[str] = None  # JSON string or comma-separated
    text_answer: Optional[str] = None
    code_answer: Optional[str] = None
    language: Optional[str] = None
    is_flagged: Optional[bool] = None


class AttemptAnswerResponse(BaseModel):
    id: str
    assessment_question_id: str
    selected_option_ids: Optional[str] = None
    text_answer: Optional[str] = None
    code_answer: Optional[str] = None
    language: Optional[str] = None
    is_flagged: bool = False
    score: Optional[float] = None
    auto_graded: bool = False

    class Config:
        from_attributes = True


class AttemptResponse(BaseModel):
    id: str
    assessment_id: str
    student_id: str
    attempt_number: int
    status: AttemptStatus
    started_at: datetime
    submitted_at: Optional[datetime] = None
    total_score: Optional[float] = None
    max_possible_score: Optional[float] = None
    passed: Optional[bool] = None
    feedback: Optional[str] = None
    time_remaining_seconds: int = 0

    class Config:
        from_attributes = True


class IntegrityEventCreate(BaseModel):
    event_type: str
    details: Optional[str] = None


class IntegrityEventResponse(BaseModel):
    id: str
    attempt_id: str
    event_type: str
    details: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class AttemptDetailResponse(AttemptResponse):
    assessment: Optional[AssessmentDetailResponse] = None
    answers: List[AttemptAnswerResponse] = []
    integrity_events: List[IntegrityEventResponse] = []

