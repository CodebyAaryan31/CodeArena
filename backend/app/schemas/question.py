from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from app.db.models.question import Difficulty, QuestionType


class QuestionOptionBase(BaseModel):
    text: str
    order_index: int = 0


class QuestionOptionCreate(QuestionOptionBase):
    is_correct: bool = False


class QuestionOptionResponse(QuestionOptionBase):
    id: str
    is_correct: Optional[bool] = None  # None for student until released


class QuestionBase(BaseModel):
    title: str = Field(..., max_length=255)
    prompt: str
    type: QuestionType = QuestionType.single_mcq
    difficulty: Difficulty = Difficulty.easy
    topic: str = "General"
    tags: Optional[str] = None
    code_snippet: Optional[str] = None
    solution_explanation: Optional[str] = None


class QuestionCreate(QuestionBase):
    options: List[QuestionOptionCreate] = []


class QuestionUpdate(BaseModel):
    title: Optional[str] = None
    prompt: Optional[str] = None
    type: Optional[QuestionType] = None
    difficulty: Optional[Difficulty] = None
    topic: Optional[str] = None
    tags: Optional[str] = None
    code_snippet: Optional[str] = None
    solution_explanation: Optional[str] = None
    options: Optional[List[QuestionOptionCreate]] = None


class QuestionResponse(QuestionBase):
    id: str
    creator_id: str
    created_at: datetime
    updated_at: datetime
    options: List[QuestionOptionResponse] = []

    class Config:
        from_attributes = True
