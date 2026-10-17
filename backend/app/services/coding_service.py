from typing import List, Optional, Any
from fastapi import HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.coding import CodingProblem, StarterCode, TestCase
from app.db.models.question import Difficulty
from app.db.models.user import User, UserRole
from app.schemas.coding import (
    CodingProblemCreate,
    CodingProblemUpdate,
    CodingProblemResponse,
    StarterCodeItem,
    TestCaseCreate,
    TestCaseUpdate,
    TestCaseResponse,
)


def _format_problem_response(p: CodingProblem, is_teacher: bool) -> CodingProblemResponse:
    tcs = []
    for tc in p.test_cases:
        if not is_teacher and tc.is_hidden:
            # Student view of hidden test case: NEVER reveal input_data or expected_output!
            tcs.append(
                TestCaseResponse(
                    id=tc.id,
                    input_data=None,
                    expected_output=None,
                    is_hidden=True,
                    weight=tc.weight,
                    order_index=tc.order_index,
                    explanation=None,
                )
            )
        else:
            tcs.append(
                TestCaseResponse(
                    id=tc.id,
                    input_data=tc.input_data,
                    expected_output=tc.expected_output,
                    is_hidden=tc.is_hidden,
                    weight=tc.weight,
                    order_index=tc.order_index,
                    explanation=tc.explanation,
                )
            )

    starters = [
        StarterCodeItem(language=sc.language, code=sc.code)
        for sc in p.starter_codes
    ]

    return CodingProblemResponse(
        id=p.id,
        creator_id=p.creator_id,
        title=p.title,
        description=p.description,
        input_format=p.input_format,
        output_format=p.output_format,
        constraints=p.constraints,
        example_input=p.example_input,
        example_output=p.example_output,
        reference_solution=p.reference_solution if is_teacher else None,
        reference_solution_language=p.reference_solution_language if is_teacher else None,
        difficulty=p.difficulty,
        topic=p.topic,
        tags=p.tags,
        time_limit_ms=p.time_limit_ms,
        memory_limit_mb=p.memory_limit_mb,
        created_at=p.created_at,
        updated_at=p.updated_at,
        starter_codes=starters,
        test_cases=tcs,
    )


async def list_coding_problems(
    db: AsyncSession,
    user: User,
    topic: Optional[str] = None,
    difficulty: Optional[Difficulty] = None,
    search: Optional[str] = None,
) -> List[CodingProblemResponse]:
    query = (
        select(CodingProblem)
        .options(
            selectinload(CodingProblem.starter_codes),
            selectinload(CodingProblem.test_cases),
        )
    )

    if topic:
        query = query.where(CodingProblem.topic == topic)
    if difficulty:
        query = query.where(CodingProblem.difficulty == difficulty)
    if search:
        pat = f"%{search}%"
        query = query.where(or_(CodingProblem.title.ilike(pat), CodingProblem.description.ilike(pat)))

    query = query.order_by(CodingProblem.created_at.desc())
    res = await db.execute(query)
    problems = res.scalars().all()

    is_teacher = user.role in (UserRole.teacher, UserRole.admin)
    return [_format_problem_response(p, is_teacher) for p in problems]


async def get_coding_problem(db: AsyncSession, problem_id: str, user: User) -> CodingProblemResponse:
    query = (
        select(CodingProblem)
        .where(CodingProblem.id == problem_id)
        .options(
            selectinload(CodingProblem.starter_codes),
            selectinload(CodingProblem.test_cases),
        )
    )
    res = await db.execute(query)
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding problem not found")

    is_teacher = user.role in (UserRole.teacher, UserRole.admin)
    return _format_problem_response(p, is_teacher)


async def create_coding_problem(db: AsyncSession, creator_id: str, req: CodingProblemCreate) -> CodingProblemResponse:
    p = CodingProblem(
        creator_id=creator_id,
        title=req.title,
        description=req.description,
        input_format=req.input_format,
        output_format=req.output_format,
        constraints=req.constraints,
        example_input=req.example_input,
        example_output=req.example_output,
        reference_solution=req.reference_solution,
        reference_solution_language=req.reference_solution_language or "python",
        difficulty=req.difficulty,
        topic=req.topic,
        tags=req.tags,
        time_limit_ms=req.time_limit_ms,
        memory_limit_mb=req.memory_limit_mb,
    )
    db.add(p)
    await db.flush()

    for sc in req.starter_codes:
        code_item = StarterCode(
            problem_id=p.id,
            language=sc.language,
            code=sc.code,
        )
        db.add(code_item)

    for idx, tc in enumerate(req.test_cases):
        tc_item = TestCase(
            problem_id=p.id,
            input_data=tc.input_data,
            expected_output=tc.expected_output,
            is_hidden=tc.is_hidden,
            weight=tc.weight,
            order_index=tc.order_index if tc.order_index is not None else idx,
            explanation=tc.explanation,
        )
        db.add(tc_item)

    await db.commit()
    return await get_coding_problem(db, p.id, User(id=creator_id, role=UserRole.teacher))


async def update_coding_problem(
    db: AsyncSession,
    problem_id: str,
    req: CodingProblemUpdate,
    user: User,
) -> CodingProblemResponse:
    query = (
        select(CodingProblem)
        .where(CodingProblem.id == problem_id)
        .options(
            selectinload(CodingProblem.starter_codes),
            selectinload(CodingProblem.test_cases),
        )
    )
    res = await db.execute(query)
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding problem not found")

    if req.title is not None:
        p.title = req.title
    if req.description is not None:
        p.description = req.description
    if req.input_format is not None:
        p.input_format = req.input_format
    if req.output_format is not None:
        p.output_format = req.output_format
    if req.constraints is not None:
        p.constraints = req.constraints
    if req.example_input is not None:
        p.example_input = req.example_input
    if req.example_output is not None:
        p.example_output = req.example_output
    if req.reference_solution is not None:
        p.reference_solution = req.reference_solution
    if req.reference_solution_language is not None:
        p.reference_solution_language = req.reference_solution_language
    if req.difficulty is not None:
        p.difficulty = req.difficulty
    if req.topic is not None:
        p.topic = req.topic
    if req.tags is not None:
        p.tags = req.tags
    if req.time_limit_ms is not None:
        p.time_limit_ms = req.time_limit_ms
    if req.memory_limit_mb is not None:
        p.memory_limit_mb = req.memory_limit_mb

    if req.starter_codes is not None:
        for sc in p.starter_codes:
            await db.delete(sc)
        for sc in req.starter_codes:
            db.add(StarterCode(problem_id=p.id, language=sc.language, code=sc.code))

    if req.test_cases is not None:
        for tc in p.test_cases:
            await db.delete(tc)
        for idx, tc in enumerate(req.test_cases):
            db.add(
                TestCase(
                    problem_id=p.id,
                    input_data=tc.input_data,
                    expected_output=tc.expected_output,
                    is_hidden=tc.is_hidden,
                    weight=tc.weight,
                    order_index=tc.order_index if tc.order_index is not None else idx,
                    explanation=tc.explanation,
                )
            )

    await db.commit()
    return await get_coding_problem(db, p.id, user)


async def delete_coding_problem(db: AsyncSession, problem_id: str):
    query = select(CodingProblem).where(CodingProblem.id == problem_id)
    res = await db.execute(query)
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding problem not found")
    await db.delete(p)
    await db.commit()


async def add_test_case(db: AsyncSession, problem_id: str, tc: TestCaseCreate, user: User) -> TestCaseResponse:
    query = select(CodingProblem).where(CodingProblem.id == problem_id)
    res = await db.execute(query)
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding problem not found")

    tc_item = TestCase(
        problem_id=p.id,
        input_data=tc.input_data,
        expected_output=tc.expected_output,
        is_hidden=tc.is_hidden,
        weight=tc.weight,
        order_index=tc.order_index,
        explanation=tc.explanation,
    )
    db.add(tc_item)
    await db.commit()
    await db.refresh(tc_item)

    is_teacher = user.role in (UserRole.teacher, UserRole.admin)
    return TestCaseResponse(
        id=tc_item.id,
        input_data=tc_item.input_data if (is_teacher or not tc_item.is_hidden) else None,
        expected_output=tc_item.expected_output if (is_teacher or not tc_item.is_hidden) else None,
        is_hidden=tc_item.is_hidden,
        weight=tc_item.weight,
        order_index=tc_item.order_index,
        explanation=tc_item.explanation,
    )


async def update_test_case(
    db: AsyncSession, problem_id: str, test_case_id: str, tc_update: Any, user: User
) -> TestCaseResponse:
    query = select(TestCase).where(TestCase.id == test_case_id, TestCase.problem_id == problem_id)
    res = await db.execute(query)
    tc = res.scalar_one_or_none()
    if not tc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found")

    if tc_update.input_data is not None:
        tc.input_data = tc_update.input_data
    if tc_update.expected_output is not None:
        tc.expected_output = tc_update.expected_output
    if tc_update.is_hidden is not None:
        tc.is_hidden = tc_update.is_hidden
    if tc_update.weight is not None:
        tc.weight = tc_update.weight
    if tc_update.order_index is not None:
        tc.order_index = tc_update.order_index
    if tc_update.explanation is not None:
        tc.explanation = tc_update.explanation

    await db.commit()
    await db.refresh(tc)

    is_teacher = user.role in (UserRole.teacher, UserRole.admin)
    return TestCaseResponse(
        id=tc.id,
        input_data=tc.input_data if (is_teacher or not tc.is_hidden) else None,
        expected_output=tc.expected_output if (is_teacher or not tc.is_hidden) else None,
        is_hidden=tc.is_hidden,
        weight=tc.weight,
        order_index=tc.order_index,
        explanation=tc.explanation,
    )


async def delete_test_case(db: AsyncSession, problem_id: str, test_case_id: str, user: User):
    query = select(TestCase).where(TestCase.id == test_case_id, TestCase.problem_id == problem_id)
    res = await db.execute(query)
    tc = res.scalar_one_or_none()
    if not tc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found")

    await db.delete(tc)
    await db.commit()


async def validate_problem_reference_solution(
    db: AsyncSession, problem_id: str, user: User
) -> Any:
    from app.services.runner_client import run_single_code
    from app.schemas.coding import ProblemValidationResponse, ProblemValidationItem

    query = (
        select(CodingProblem)
        .where(CodingProblem.id == problem_id)
        .options(selectinload(CodingProblem.test_cases))
    )
    res = await db.execute(query)
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding problem not found")

    if not p.reference_solution or not p.reference_solution.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No reference solution provided for this problem. Author a reference solution first.",
        )

    if not p.test_cases or len(p.test_cases) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No test cases configured for this problem to validate against.",
        )

    results = []
    passed_count = 0
    lang = p.reference_solution_language or "python"

    for tc in p.test_cases:
        run_res = await run_single_code(
            language=lang,
            source_code=p.reference_solution,
            stdin=tc.input_data,
            expected_output=tc.expected_output,
            time_limit_ms=p.time_limit_ms,
            memory_limit_mb=p.memory_limit_mb,
        )
        verdict = run_res.get("verdict", "system_error")
        passed = verdict == "accepted"
        if passed:
            passed_count += 1

        results.append(
            ProblemValidationItem(
                test_case_id=tc.id,
                order_index=tc.order_index,
                is_hidden=tc.is_hidden,
                status="passed" if passed else "failed",
                runtime_ms=run_res.get("runtime_ms", 0),
                verdict=verdict,
                message=run_res.get("stderr") or run_res.get("stdout") or None,
            )
        )

    return ProblemValidationResponse(
        problem_id=p.id,
        all_passed=passed_count == len(p.test_cases),
        total_tests=len(p.test_cases),
        passed_tests=passed_count,
        results=results,
    )
