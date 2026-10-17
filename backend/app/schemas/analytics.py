from typing import List, Optional
from pydantic import BaseModel


class ScoreBucket(BaseModel):
    range_label: str
    count: int


class QuestionAccuracy(BaseModel):
    question_id: str
    title: str
    type: str
    accuracy_percentage: float
    total_responses: int


class AssessmentAnalyticsResponse(BaseModel):
    assessment_id: str
    title: str
    total_assigned: int
    total_submissions: int
    completion_rate: float
    average_score: float
    highest_score: float
    lowest_score: float
    pass_rate: float
    score_distribution: List[ScoreBucket] = []
    question_performance: List[QuestionAccuracy] = []


class LeaderboardEntry(BaseModel):
    rank: int
    student_id: str
    student_name: str
    score: float
    max_score: float
    percentage: float
    completion_time_minutes: float
