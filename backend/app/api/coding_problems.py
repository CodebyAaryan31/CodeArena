from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, RequireTeacher
from app.db.session import get_db
from app.db.models.question import Difficulty
from app.schemas.coding import (
    CodingProblemCreate,
    CodingProblemUpdate,
    CodingProblemResponse,
    TestCaseCreate,
    TestCaseUpdate,
    TestCaseResponse,
    ProblemValidationResponse,
)
from app.services import coding_service

router = APIRouter(prefix="/coding-problems", tags=["coding-problems"])


@router.get("/", response_model=List[CodingProblemResponse])
async def list_problems(
    current_user: CurrentUser,
    topic: Optional[str] = None,
    difficulty: Optional[Difficulty] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    return await coding_service.list_coding_problems(
        db=db,
        user=current_user,
        topic=topic,
        difficulty=difficulty,
        search=search,
    )


@router.get("/{problem_id}", response_model=CodingProblemResponse)
async def get_problem(
    problem_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    return await coding_service.get_coding_problem(db, problem_id, current_user)


@router.post("/", response_model=CodingProblemResponse, status_code=201)
async def create_problem(
    req: CodingProblemCreate,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    return await coding_service.create_coding_problem(db, current_user.id, req)


@router.patch("/{problem_id}", response_model=CodingProblemResponse)
async def update_problem(
    problem_id: str,
    req: CodingProblemUpdate,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    return await coding_service.update_coding_problem(db, problem_id, req, current_user)


@router.delete("/{problem_id}", status_code=204)
async def delete_problem(
    problem_id: str,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    await coding_service.delete_coding_problem(db, problem_id)


@router.post("/{problem_id}/test-cases", response_model=TestCaseResponse, status_code=201)
async def add_test_case(
    problem_id: str,
    req: TestCaseCreate,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    return await coding_service.add_test_case(db, problem_id, req, current_user)


@router.patch("/{problem_id}/test-cases/{test_case_id}", response_model=TestCaseResponse)
async def update_test_case(
    problem_id: str,
    test_case_id: str,
    req: TestCaseUpdate,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    return await coding_service.update_test_case(db, problem_id, test_case_id, req, current_user)


@router.delete("/{problem_id}/test-cases/{test_case_id}", status_code=204)
async def delete_test_case(
    problem_id: str,
    test_case_id: str,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    await coding_service.delete_test_case(db, problem_id, test_case_id, current_user)


@router.post("/{problem_id}/validate", response_model=ProblemValidationResponse)
async def validate_reference_solution(
    problem_id: str,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    return await coding_service.validate_problem_reference_solution(db, problem_id, current_user)

