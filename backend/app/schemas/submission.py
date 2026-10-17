from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from app.db.models.submission import SubmissionStatus, Verdict


class QuickRunRequest(BaseModel):
    problem_id: str
    language: str
    source_code: str
    stdin: Optional[str] = None  # Custom test input if provided


class QuickRunTestCaseResult(BaseModel):
    test_case_id: Optional[str] = None
    input_data: str
    expected_output: Optional[str] = None
    actual_output: Optional[str] = None
    passed: bool
    verdict: str
    execution_time_ms: int = 0
    stderr: Optional[str] = None


class QuickRunResponse(BaseModel):
    status: str
    overall_verdict: str
    results: List[QuickRunTestCaseResult] = []


class SubmissionCreate(BaseModel):
    problem_id: str
    language: str
    source_code: str
    attempt_id: Optional[str] = None


class SubmissionTestResultResponse(BaseModel):
    id: str
    test_case_id: str
    verdict: Verdict
    execution_time_ms: Optional[int] = None
    actual_output: Optional[str] = None  # None for hidden test cases if student
    error_message: Optional[str] = None
    passed: bool
    is_hidden: bool

    class Config:
        from_attributes = True


class SubmissionResponse(BaseModel):
    id: str
    attempt_id: Optional[str] = None
    problem_id: str
    student_id: str
    language: str
    status: SubmissionStatus
    verdict: Optional[Verdict] = None
    score: Optional[float] = None
    execution_time_ms: Optional[int] = None
    memory_kb: Optional[int] = None
    error_output: Optional[str] = None
    created_at: datetime
    test_results: List[SubmissionTestResultResponse] = []

    class Config:
        from_attributes = True


class SubmissionDetailResponse(SubmissionResponse):
    source_code: str
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    problem_title: Optional[str] = None
