from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from app.db.models.assessment import AssessmentState
from app.schemas.question import QuestionResponse
from app.schemas.coding import CodingProblemResponse


class AssessmentQuestionCreate(BaseModel):
    question_id: Optional[str] = None
    problem_id: Optional[str] = None
    order_index: int = 0
    points: float = 10.0


class AssessmentQuestionResponse(BaseModel):
    id: str
    assessment_id: str
    question_id: Optional[str] = None
    problem_id: Optional[str] = None
    order_index: int
    points: float
    question: Optional[QuestionResponse] = None
    problem: Optional[CodingProblemResponse] = None

    class Config:
        from_attributes = True


class AssessmentCreate(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    duration_minutes: int = Field(60, ge=1)
    pass_percentage: float = Field(50.0, ge=0.0, le=100.0)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_attempts: int = Field(1, ge=1)
    shuffle_questions: bool = False
    questions: List[AssessmentQuestionCreate] = []


class AssessmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    pass_percentage: Optional[float] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_attempts: Optional[int] = None
    shuffle_questions: Optional[bool] = None
    results_released: Optional[bool] = None
    questions: Optional[List[AssessmentQuestionCreate]] = None


class AssessmentResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    teacher_id: str
    state: AssessmentState
    duration_minutes: int
    pass_percentage: float
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_attempts: int
    shuffle_questions: bool
    results_released: bool
    created_at: datetime
    updated_at: datetime
    question_count: int = 0
    total_points: float = 0.0
    is_open: bool = False
    is_closed: bool = False
    is_upcoming: bool = False

    class Config:
        from_attributes = True


class AssessmentDetailResponse(AssessmentResponse):
    questions: List[AssessmentQuestionResponse] = []
