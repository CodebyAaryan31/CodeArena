from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.assessment import Assessment, AssessmentQuestion, AssessmentState
from app.db.models.question import Question, QuestionOption
from app.db.models.coding import CodingProblem, TestCase
from app.db.models.user import User, UserRole
from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentUpdate,
    AssessmentResponse,
    AssessmentDetailResponse,
    AssessmentQuestionResponse,
)
from app.services.question_service import get_question
from app.services.coding_service import _format_problem_response
from app.schemas.question import QuestionOptionResponse, QuestionResponse


def _format_assessment(a: Assessment, is_teacher: bool) -> AssessmentResponse:
    q_count = len(a.questions)
    total_pts = sum(q.points for q in a.questions)
    return AssessmentResponse(
        id=a.id,
        title=a.title,
        description=a.description,
        teacher_id=a.teacher_id,
        state=a.state,
        duration_minutes=a.duration_minutes,
        pass_percentage=a.pass_percentage,
        start_time=a.start_time,
        end_time=a.end_time,
        max_attempts=a.max_attempts,
        shuffle_questions=a.shuffle_questions,
        results_released=a.results_released,
        created_at=a.created_at,
        updated_at=a.updated_at,
        question_count=q_count,
        total_points=total_pts,
        is_open=a.is_open(),
        is_closed=a.is_closed(),
        is_upcoming=a.is_upcoming(),
    )


def _format_assessment_detail(a: Assessment, is_teacher: bool) -> AssessmentDetailResponse:
    base = _format_assessment(a, is_teacher)

    q_responses = []
    for aq in a.questions:
        q_resp = None
        prob_resp = None

        if aq.question:
            opts = [
                QuestionOptionResponse(
                    id=opt.id,
                    text=opt.text,
                    order_index=opt.order_index,
                    is_correct=opt.is_correct if is_teacher else None,
                )
                for opt in aq.question.options
            ]
            q_resp = QuestionResponse(
                id=aq.question.id,
                creator_id=aq.question.creator_id,
                title=aq.question.title,
                prompt=aq.question.prompt,
                type=aq.question.type,
                difficulty=aq.question.difficulty,
                topic=aq.question.topic,
                tags=aq.question.tags,
                code_snippet=aq.question.code_snippet,
                solution_explanation=aq.question.solution_explanation if is_teacher else None,
                created_at=aq.question.created_at,
                updated_at=aq.question.updated_at,
                options=opts,
            )

        if aq.problem:
            prob_resp = _format_problem_response(aq.problem, is_teacher)

        q_responses.append(
            AssessmentQuestionResponse(
                id=aq.id,
                assessment_id=aq.assessment_id,
                question_id=aq.question_id,
                problem_id=aq.problem_id,
                order_index=aq.order_index,
                points=aq.points,
                question=q_resp,
                problem=prob_resp,
            )
        )

    return AssessmentDetailResponse(
        **base.model_dump(),
        questions=q_responses,
    )


async def list_assessments(db: AsyncSession, user: User) -> List[AssessmentResponse]:
    query = (
        select(Assessment)
        .options(
            selectinload(Assessment.questions),
        )
    )

    is_teacher = user.role in (UserRole.teacher, UserRole.admin)
    if is_teacher:
        query = query.where(Assessment.teacher_id == user.id)
    else:
        # Students see published or scheduled assessments (never drafts or archived)
        query = query.where(Assessment.state.in_([AssessmentState.published, AssessmentState.scheduled]))

    query = query.order_by(Assessment.created_at.desc())
    res = await db.execute(query)
    assessments = res.scalars().all()
    return [_format_assessment(a, is_teacher) for a in assessments]


async def get_assessment(db: AsyncSession, assessment_id: str, user: User) -> AssessmentDetailResponse:
    query = (
        select(Assessment)
        .where(Assessment.id == assessment_id)
        .options(
            selectinload(Assessment.questions)
            .selectinload(AssessmentQuestion.question)
            .selectinload(Question.options),
            selectinload(Assessment.questions)
            .selectinload(AssessmentQuestion.problem)
            .selectinload(CodingProblem.starter_codes),
            selectinload(Assessment.questions)
            .selectinload(AssessmentQuestion.problem)
            .selectinload(CodingProblem.test_cases),
        )
        .execution_options(populate_existing=True)
    )
    res = await db.execute(query)
    a = res.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")

    is_teacher = user.role in (UserRole.teacher, UserRole.admin)
    if not is_teacher and a.state not in (AssessmentState.published, AssessmentState.scheduled):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Assessment is not published")

    return _format_assessment_detail(a, is_teacher)


async def create_assessment(db: AsyncSession, teacher_id: str, req: AssessmentCreate) -> AssessmentDetailResponse:
    a = Assessment(
        title=req.title,
        description=req.description,
        teacher_id=teacher_id,
        state=AssessmentState.draft,
        duration_minutes=req.duration_minutes,
        pass_percentage=req.pass_percentage,
        start_time=req.start_time,
        end_time=req.end_time,
        max_attempts=req.max_attempts,
        shuffle_questions=req.shuffle_questions,
    )
    db.add(a)
    await db.flush()

    for idx, q_in in enumerate(req.questions):
        aq = AssessmentQuestion(
            assessment_id=a.id,
            question_id=q_in.question_id,
            problem_id=q_in.problem_id,
            order_index=q_in.order_index if q_in.order_index is not None else idx,
            points=q_in.points,
        )
        db.add(aq)

    await db.commit()
    return await get_assessment(db, a.id, User(id=teacher_id, role=UserRole.teacher))


async def update_assessment(
    db: AsyncSession,
    assessment_id: str,
    req: AssessmentUpdate,
    user: User,
) -> AssessmentDetailResponse:
    query = (
        select(Assessment)
        .where(Assessment.id == assessment_id)
        .options(selectinload(Assessment.questions))
    )
    res = await db.execute(query)
    a = res.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    if a.teacher_id != user.id and user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this assessment")

    if req.title is not None:
        a.title = req.title
    if req.description is not None:
        a.description = req.description
    if req.duration_minutes is not None:
        a.duration_minutes = req.duration_minutes
    if req.pass_percentage is not None:
        a.pass_percentage = req.pass_percentage
    if req.start_time is not None:
        a.start_time = req.start_time
    if req.end_time is not None:
        a.end_time = req.end_time
    if req.max_attempts is not None:
        a.max_attempts = req.max_attempts
    if req.shuffle_questions is not None:
        a.shuffle_questions = req.shuffle_questions
    if req.results_released is not None:
        a.results_released = req.results_released

    if req.questions is not None:
        a.questions.clear()
        await db.flush()
        for idx, q_in in enumerate(req.questions):
            a.questions.append(
                AssessmentQuestion(
                    assessment_id=a.id,
                    question_id=q_in.question_id,
                    problem_id=q_in.problem_id,
                    order_index=q_in.order_index if q_in.order_index is not None else idx,
                    points=q_in.points,
                )
            )

    await db.commit()
    return await get_assessment(db, a.id, user)


async def delete_assessment(db: AsyncSession, assessment_id: str, user: User):
    query = select(Assessment).where(Assessment.id == assessment_id)
    res = await db.execute(query)
    a = res.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    if a.teacher_id != user.id and user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if a.state != AssessmentState.draft:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft assessments can be deleted. Use archive instead.",
        )
    await db.delete(a)
    await db.commit()


async def publish_assessment(db: AsyncSession, assessment_id: str, user: User) -> AssessmentResponse:
    query = (
        select(Assessment)
        .where(Assessment.id == assessment_id)
        .options(selectinload(Assessment.questions))
    )
    res = await db.execute(query)
    a = res.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    if a.teacher_id != user.id and user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to publish this assessment")

    # Lifecycle state transition validation
    if a.state == AssessmentState.archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archived assessments cannot be published directly. Duplicate the assessment to create a new draft.",
        )

    # 1. Title validation
    if not a.title or not a.title.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assessment title cannot be empty.")

    # 2. Minimum questions requirement
    if not a.questions or len(a.questions) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot publish an assessment with zero questions. Add at least one question slot.",
        )

    # 3. Points validation
    for idx, aq in enumerate(a.questions):
        if aq.points is None or aq.points <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Question slot #{idx + 1} must have a positive point value (found {aq.points}).",
            )

    # 4. Date interval validation
    now = datetime.now(timezone.utc)
    if a.start_time and a.end_time:
        st = a.start_time if a.start_time.tzinfo else a.start_time.replace(tzinfo=timezone.utc)
        et = a.end_time if a.end_time.tzinfo else a.end_time.replace(tzinfo=timezone.utc)
        if et <= st:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assessment end time must be strictly after the start time.",
            )
        if et < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot publish an assessment whose deadline (end time) is already in the past.",
            )

    # 5. Question & Coding Problem integrity validation
    for idx, aq in enumerate(a.questions):
        if aq.problem_id:
            prob_query = select(CodingProblem).where(CodingProblem.id == aq.problem_id)
            prob_res = await db.execute(prob_query)
            prob = prob_res.scalar_one_or_none()
            if not prob:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Slot #{idx + 1} references a coding problem that no longer exists.",
                )
            tc_count = await db.scalar(select(func.count(TestCase.id)).where(TestCase.problem_id == aq.problem_id))
            if not tc_count or tc_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Coding problem '{prob.title}' in slot #{idx + 1} has zero test cases. Add test cases before publishing.",
                )
        elif aq.question_id:
            q_query = select(Question).where(Question.id == aq.question_id)
            q_res = await db.execute(q_query)
            q_item = q_res.scalar_one_or_none()
            if not q_item:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Slot #{idx + 1} references a question that no longer exists.",
                )

    # 6. Apply lifecycle state: scheduled if start_time is in the future, published if active/no window
    if a.start_time:
        st = a.start_time if a.start_time.tzinfo else a.start_time.replace(tzinfo=timezone.utc)
        if st > now:
            a.state = AssessmentState.scheduled
        else:
            a.state = AssessmentState.published
    else:
        a.state = AssessmentState.published

    await db.commit()
    return _format_assessment(a, is_teacher=True)


async def archive_assessment(db: AsyncSession, assessment_id: str, user: User) -> AssessmentResponse:
    query = select(Assessment).where(Assessment.id == assessment_id).options(selectinload(Assessment.questions))
    res = await db.execute(query)
    a = res.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    if a.teacher_id != user.id and user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    a.state = AssessmentState.archived
    await db.commit()
    return _format_assessment(a, is_teacher=True)


async def duplicate_assessment(db: AsyncSession, assessment_id: str, user: User) -> AssessmentDetailResponse:
    detail = await get_assessment(db, assessment_id, user)
    new_title = f"{detail.title} (Copy)"
    q_creates = []
    for q in detail.questions:
        q_creates.append(
            AssessmentQuestion(
                question_id=q.question_id,
                problem_id=q.problem_id,
                order_index=q.order_index,
                points=q.points,
            )
        )

    new_a = Assessment(
        title=new_title,
        description=detail.description,
        teacher_id=user.id,
        state=AssessmentState.draft,
        duration_minutes=detail.duration_minutes,
        pass_percentage=detail.pass_percentage,
        max_attempts=detail.max_attempts,
        shuffle_questions=detail.shuffle_questions,
    )
    db.add(new_a)
    await db.flush()

    for q in q_creates:
        q.assessment_id = new_a.id
        db.add(q)

    await db.commit()
    return await get_assessment(db, new_a.id, user)
