import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.assessment import Assessment, AssessmentQuestion, AssessmentState
from app.db.models.question import Question, QuestionOption, QuestionType
from app.db.models.coding import CodingProblem
from app.db.models.attempt import AssessmentAttempt, AttemptAnswer, AttemptStatus, ExamIntegrityEvent
from app.db.models.user import User, UserRole
from app.schemas.attempt import (
    AnswerSaveRequest,
    AttemptAnswerResponse,
    AttemptDetailResponse,
    AttemptResponse,
    IntegrityEventCreate,
    IntegrityEventResponse,
)
from app.services.assessment_service import get_assessment



def _calc_time_remaining(attempt: AssessmentAttempt, duration_minutes: int) -> int:
    if attempt.status != AttemptStatus.in_progress:
        return 0
    now = datetime.now(timezone.utc)
    started = attempt.started_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    end_at = started + timedelta(minutes=duration_minutes)
    remaining = int((end_at - now).total_seconds())
    return max(0, remaining)


async def start_or_resume_attempt(db: AsyncSession, assessment_id: str, student: User) -> AttemptDetailResponse:
    # 1. Fetch assessment
    query = (
        select(Assessment)
        .where(Assessment.id == assessment_id)
        .options(
            selectinload(Assessment.questions),
        )
    )
    res = await db.execute(query)
    a = res.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    if a.state == AssessmentState.draft:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This assessment is in draft mode and not available to students.")
    if a.state == AssessmentState.archived:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This assessment is archived and no longer accepting attempts.")
    if not a.is_open():
        if a.is_upcoming():
            start_str = a.start_time.strftime("%b %d, %Y at %H:%M UTC") if a.start_time else "the scheduled start time"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This assessment has not started yet. It opens on {start_str}."
            )
        if a.is_closed():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This assessment is closed. The submission deadline has passed."
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assessment is not currently open for examination.")

    # 2. Check existing attempts
    existing_query = (
        select(AssessmentAttempt)
        .where(
            AssessmentAttempt.assessment_id == assessment_id,
            AssessmentAttempt.student_id == student.id,
        )
        .order_by(AssessmentAttempt.attempt_number.desc())
    )
    existing_res = await db.execute(existing_query)
    attempts = existing_res.scalars().all()

    # Check for active in_progress attempt
    active_attempt = next((att for att in attempts if att.status == AttemptStatus.in_progress), None)
    if active_attempt:
        # Check if expired
        rem = _calc_time_remaining(active_attempt, a.duration_minutes)
        if rem <= 0:
            active_attempt.status = AttemptStatus.expired
            await db.commit()
        else:
            return await get_attempt_detail(db, active_attempt.id, student)

    # Check attempt limit
    if len(attempts) >= a.max_attempts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum attempts ({a.max_attempts}) reached for this assessment",
        )

    # Create new attempt
    new_att = AssessmentAttempt(
        assessment_id=a.id,
        student_id=student.id,
        attempt_number=len(attempts) + 1,
        status=AttemptStatus.in_progress,
        started_at=datetime.now(timezone.utc),
    )
    db.add(new_att)
    await db.flush()

    # Pre-populate answers for each question
    for aq in a.questions:
        ans = AttemptAnswer(
            attempt_id=new_att.id,
            assessment_question_id=aq.id,
        )
        db.add(ans)

    await db.commit()
    return await get_attempt_detail(db, new_att.id, student)


async def get_attempt_detail(db: AsyncSession, attempt_id: str, user: User) -> AttemptDetailResponse:
    query = (
        select(AssessmentAttempt)
        .where(AssessmentAttempt.id == attempt_id)
        .options(
            selectinload(AssessmentAttempt.answers),
            selectinload(AssessmentAttempt.assessment),
            selectinload(AssessmentAttempt.integrity_events),
        )
    )
    res = await db.execute(query)
    att = res.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    is_teacher = user.role in (UserRole.teacher, UserRole.admin)
    if not is_teacher and att.student_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this attempt")

    assessment_detail = await get_assessment(db, att.assessment_id, user)
    time_rem = _calc_time_remaining(att, assessment_detail.duration_minutes)

    # Check if timer expired in runtime
    if att.status == AttemptStatus.in_progress and time_rem <= 0:
        att.status = AttemptStatus.expired
        await db.commit()

    ans_responses = [
        AttemptAnswerResponse(
            id=ans.id,
            assessment_question_id=ans.assessment_question_id,
            selected_option_ids=ans.selected_option_ids,
            text_answer=ans.text_answer,
            code_answer=ans.code_answer,
            language=ans.language,
            is_flagged=ans.is_flagged,
            score=ans.score if (is_teacher or assessment_detail.results_released) else None,
            auto_graded=ans.auto_graded,
        )
        for ans in att.answers
    ]

    return AttemptDetailResponse(
        id=att.id,
        assessment_id=att.assessment_id,
        student_id=att.student_id,
        attempt_number=att.attempt_number,
        status=att.status,
        started_at=att.started_at,
        submitted_at=att.submitted_at,
        total_score=att.total_score if (is_teacher or assessment_detail.results_released) else None,
        max_possible_score=att.max_possible_score if (is_teacher or assessment_detail.results_released) else None,
        passed=att.passed if (is_teacher or assessment_detail.results_released) else None,
        feedback=att.feedback if (is_teacher or assessment_detail.results_released) else None,
        time_remaining_seconds=time_rem,
        assessment=assessment_detail,
        answers=ans_responses,
        integrity_events=[
            IntegrityEventResponse(
                id=ev.id,
                attempt_id=ev.attempt_id,
                event_type=ev.event_type,
                details=ev.details,
                timestamp=ev.timestamp,
            )
            for ev in (att.integrity_events or [])
        ],
    )


async def save_answer(db: AsyncSession, attempt_id: str, student: User, req: AnswerSaveRequest) -> AttemptAnswerResponse:
    query = select(AssessmentAttempt).where(AssessmentAttempt.id == attempt_id)
    res = await db.execute(query)
    att = res.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    if att.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if att.status != AttemptStatus.in_progress:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt is already closed")

    ans_query = select(AttemptAnswer).where(
        AttemptAnswer.attempt_id == attempt_id,
        AttemptAnswer.assessment_question_id == req.assessment_question_id,
    )
    ans_res = await db.execute(ans_query)
    ans = ans_res.scalar_one_or_none()
    if not ans:
        ans = AttemptAnswer(
            attempt_id=attempt_id,
            assessment_question_id=req.assessment_question_id,
        )
        db.add(ans)

    if req.selected_option_ids is not None:
        ans.selected_option_ids = req.selected_option_ids
    if req.text_answer is not None:
        ans.text_answer = req.text_answer
    if req.code_answer is not None:
        ans.code_answer = req.code_answer
    if req.language is not None:
        ans.language = req.language
    if req.is_flagged is not None:
        ans.is_flagged = req.is_flagged

    await db.commit()
    return AttemptAnswerResponse(
        id=ans.id,
        assessment_question_id=ans.assessment_question_id,
        selected_option_ids=ans.selected_option_ids,
        text_answer=ans.text_answer,
        code_answer=ans.code_answer,
        language=ans.language,
        is_flagged=ans.is_flagged,
        score=None,
        auto_graded=ans.auto_graded,
    )


async def submit_attempt(db: AsyncSession, attempt_id: str, student: User) -> AttemptDetailResponse:
    query = (
        select(AssessmentAttempt)
        .where(AssessmentAttempt.id == attempt_id)
        .options(
            selectinload(AssessmentAttempt.answers),
            selectinload(AssessmentAttempt.assessment)
            .selectinload(Assessment.questions)
            .selectinload(AssessmentQuestion.question)
            .selectinload(Question.options),
            selectinload(AssessmentAttempt.assessment)
            .selectinload(Assessment.questions)
            .selectinload(AssessmentQuestion.problem),
        )
    )
    res = await db.execute(query)
    att = res.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    if att.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if att.status in (AttemptStatus.submitted, AttemptStatus.evaluated):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt is already submitted")

    # Evaluate objective questions
    total_score = 0.0
    max_score = sum(aq.points for aq in att.assessment.questions)

    for aq in att.assessment.questions:
        ans = next((a for a in att.answers if a.assessment_question_id == aq.id), None)
        if not ans:
            continue

        if aq.question:
            q = aq.question
            if q.type == QuestionType.single_mcq:
                # Find correct option id
                correct_opt = next((o.id for o in q.options if o.is_correct), None)
                if ans.selected_option_ids and correct_opt and (ans.selected_option_ids.strip() == correct_opt or correct_opt in ans.selected_option_ids):
                    ans.score = aq.points
                else:
                    ans.score = 0.0
                ans.auto_graded = True
                total_score += ans.score

            elif q.type == QuestionType.multi_mcq:
                correct_ids = set(o.id for o in q.options if o.is_correct)
                try:
                    selected = set(json.loads(ans.selected_option_ids or "[]"))
                except Exception:
                    selected = set(ans.selected_option_ids.split(",")) if ans.selected_option_ids else set()

                if selected == correct_ids:
                    ans.score = aq.points
                else:
                    ans.score = 0.0
                ans.auto_graded = True
                total_score += ans.score

            elif q.type in (QuestionType.output_prediction, QuestionType.short_answer):
                if q.solution_explanation and ans.text_answer:
                    if ans.text_answer.strip().lower() == q.solution_explanation.strip().lower():
                        ans.score = aq.points
                    else:
                        ans.score = 0.0
                    ans.auto_graded = True
                    total_score += ans.score
                else:
                    ans.score = 0.0

        elif aq.problem:
            # Coding question score taken from latest evaluated submission score if available
            ans_score = ans.score or 0.0
            total_score += ans_score

    att.status = AttemptStatus.submitted
    att.submitted_at = datetime.now(timezone.utc)
    att.total_score = total_score
    att.max_possible_score = max_score
    percentage = (total_score / max_score * 100.0) if max_score > 0 else 0.0
    att.passed = percentage >= att.assessment.pass_percentage

    await db.commit()
    return await get_attempt_detail(db, att.id, student)


async def record_integrity_event(
    db: AsyncSession, attempt_id: str, student: User, req: IntegrityEventCreate
) -> IntegrityEventResponse:
    query = select(AssessmentAttempt).where(AssessmentAttempt.id == attempt_id)
    res = await db.execute(query)
    att = res.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    if att.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if att.status != AttemptStatus.in_progress:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt is already closed")

    ev = ExamIntegrityEvent(
        attempt_id=attempt_id,
        event_type=req.event_type,
        details=req.details,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(ev)
    await db.commit()
    await db.refresh(ev)

    return IntegrityEventResponse(
        id=ev.id,
        attempt_id=ev.attempt_id,
        event_type=ev.event_type,
        details=ev.details,
        timestamp=ev.timestamp,
    )


async def get_integrity_events(
    db: AsyncSession, attempt_id: str, user: User
) -> List[IntegrityEventResponse]:
    query = select(AssessmentAttempt).where(AssessmentAttempt.id == attempt_id)
    res = await db.execute(query)
    att = res.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    is_teacher = user.role in (UserRole.teacher, UserRole.admin)
    if not is_teacher and att.student_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    ev_query = (
        select(ExamIntegrityEvent)
        .where(ExamIntegrityEvent.attempt_id == attempt_id)
        .order_by(ExamIntegrityEvent.timestamp.desc())
    )
    ev_res = await db.execute(ev_query)
    events = ev_res.scalars().all()

    return [
        IntegrityEventResponse(
            id=ev.id,
            attempt_id=ev.attempt_id,
            event_type=ev.event_type,
            details=ev.details,
            timestamp=ev.timestamp,
        )
        for ev in events
    ]


async def list_user_attempts(
    db: AsyncSession,
    user: User,
    assessment_id: Optional[str] = None,
) -> List[AttemptResponse]:
    query = (
        select(AssessmentAttempt)
        .options(selectinload(AssessmentAttempt.assessment))
        .order_by(AssessmentAttempt.started_at.desc())
    )
    is_teacher = user.role in (UserRole.teacher, UserRole.admin)
    if not is_teacher:
        query = query.where(AssessmentAttempt.student_id == user.id)
    if assessment_id:
        query = query.where(AssessmentAttempt.assessment_id == assessment_id)

    res = await db.execute(query)
    attempts = res.scalars().all()

    results = []
    for att in attempts:
        released = is_teacher or (att.assessment and att.assessment.results_released)
        time_rem = _calc_time_remaining(att, att.assessment.duration_minutes if att.assessment else 60)
        results.append(
            AttemptResponse(
                id=att.id,
                assessment_id=att.assessment_id,
                student_id=att.student_id,
                attempt_number=att.attempt_number,
                status=att.status,
                started_at=att.started_at,
                submitted_at=att.submitted_at,
                total_score=att.total_score if released else None,
                max_possible_score=att.max_possible_score if released else None,
                passed=att.passed if released else None,
                feedback=att.feedback if released else None,
                time_remaining_seconds=time_rem,
            )
        )
    return results


