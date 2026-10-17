from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from app.db.models.question import Difficulty


class TestCaseCreate(BaseModel):
    input_data: str
    expected_output: str
    is_hidden: bool = False
    weight: float = 1.0
    order_index: int = 0
    explanation: Optional[str] = None


class TestCaseUpdate(BaseModel):
    input_data: Optional[str] = None
    expected_output: Optional[str] = None
    is_hidden: Optional[bool] = None
    weight: Optional[float] = None
    order_index: Optional[int] = None
    explanation: Optional[str] = None


class TestCaseResponse(BaseModel):
    id: str
    input_data: Optional[str] = None       # Stripped if is_hidden and user is student
    expected_output: Optional[str] = None  # Stripped if is_hidden and user is student
    is_hidden: bool
    weight: float
    order_index: int
    explanation: Optional[str] = None

    class Config:
        from_attributes = True


class StarterCodeItem(BaseModel):
    language: str
    code: str


class CodingProblemCreate(BaseModel):
    title: str = Field(..., max_length=255)
    description: str
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    example_input: Optional[str] = None
    example_output: Optional[str] = None
    reference_solution: Optional[str] = None
    reference_solution_language: Optional[str] = "python"
    difficulty: Difficulty = Difficulty.easy
    topic: str = "Algorithms"
    tags: Optional[str] = None
    time_limit_ms: int = 2000
    memory_limit_mb: int = 256
    starter_codes: List[StarterCodeItem] = []
    test_cases: List[TestCaseCreate] = []


class CodingProblemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    example_input: Optional[str] = None
    example_output: Optional[str] = None
    reference_solution: Optional[str] = None
    reference_solution_language: Optional[str] = None
    difficulty: Optional[Difficulty] = None
    topic: Optional[str] = None
    tags: Optional[str] = None
    time_limit_ms: Optional[int] = None
    memory_limit_mb: Optional[int] = None
    starter_codes: Optional[List[StarterCodeItem]] = None
    test_cases: Optional[List[TestCaseCreate]] = None


class CodingProblemResponse(BaseModel):
    id: str
    creator_id: str
    title: str
    description: str
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    example_input: Optional[str] = None
    example_output: Optional[str] = None
    reference_solution: Optional[str] = None  # None for students
    reference_solution_language: Optional[str] = None
    difficulty: Difficulty
    topic: str
    tags: Optional[str] = None
    time_limit_ms: int
    memory_limit_mb: int
    created_at: datetime
    updated_at: datetime
    starter_codes: List[StarterCodeItem] = []
    test_cases: List[TestCaseResponse] = []

    class Config:
        from_attributes = True


class ProblemValidationItem(BaseModel):
    test_case_id: str
    order_index: int
    is_hidden: bool
    status: str
    runtime_ms: int
    verdict: str
    message: Optional[str] = None


class ProblemValidationResponse(BaseModel):
    problem_id: str
    all_passed: bool
    total_tests: int
    passed_tests: int
    results: List[ProblemValidationItem]
