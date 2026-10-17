from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.coding import CodingProblem, TestCase
from app.db.models.submission import Submission, SubmissionTestResult, SubmissionStatus, Verdict
from app.db.models.attempt import AssessmentAttempt, AttemptAnswer
from app.db.models.assessment import AssessmentQuestion
from app.db.models.user import User, UserRole
from app.schemas.submission import (
    QuickRunRequest,
    QuickRunResponse,
    QuickRunTestCaseResult,
    SubmissionCreate,
    SubmissionResponse,
    SubmissionDetailResponse,
    SubmissionTestResultResponse,
)
from app.services.runner_client import run_single_code, run_batch_code


async def quick_run_sample_tests(
    db: AsyncSession,
    user: User,
    req: QuickRunRequest,
) -> QuickRunResponse:
    query = (
        select(CodingProblem)
        .where(CodingProblem.id == req.problem_id)
        .options(selectinload(CodingProblem.test_cases))
    )
    res = await db.execute(query)
    problem = res.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding problem not found")

    # If custom stdin was provided, run against that
    if req.stdin:
        run_res = await run_single_code(
            language=req.language,
            source_code=req.source_code,
            stdin=req.stdin,
            time_limit_ms=problem.time_limit_ms,
            memory_limit_mb=problem.memory_limit_mb,
        )
        return QuickRunResponse(
            status=run_res.get("status", "ok"),
            overall_verdict=run_res.get("verdict", "accepted"),
            results=[
                QuickRunTestCaseResult(
                    input_data=req.stdin,
                    actual_output=run_res.get("stdout"),
                    passed=run_res.get("verdict") == "accepted",
                    verdict=run_res.get("verdict", "accepted"),
                    execution_time_ms=run_res.get("execution_time_ms", 0),
                    stderr=run_res.get("stderr"),
                )
            ],
        )

    # Otherwise run against all PUBLIC test cases only (sample tests)
    public_cases = [tc for tc in problem.test_cases if not tc.is_hidden]
    if not public_cases:
        # Fallback to the first test case if none marked public
        public_cases = problem.test_cases[:1]

    batch_cases = [
        {
            "id": tc.id,
            "input_data": tc.input_data,
            "expected_output": tc.expected_output,
            "weight": tc.weight,
        }
        for tc in public_cases
    ]

    batch_res = await run_batch_code(
        language=req.language,
        source_code=req.source_code,
        test_cases=batch_cases,
        time_limit_ms=problem.time_limit_ms,
        memory_limit_mb=problem.memory_limit_mb,
    )

    tc_results = []
    for tc, r in zip(public_cases, batch_res.get("results", [])):
        tc_results.append(
            QuickRunTestCaseResult(
                test_case_id=tc.id,
                input_data=tc.input_data,
                expected_output=tc.expected_output,
                actual_output=r.get("stdout"),
                passed=r.get("passed", False),
                verdict=r.get("verdict", "wrong_answer"),
                execution_time_ms=r.get("execution_time_ms", 0),
                stderr=r.get("stderr"),
            )
        )

    return QuickRunResponse(
        status=batch_res.get("status", "ok"),
        overall_verdict=batch_res.get("overall_verdict", "wrong_answer"),
        results=tc_results,
    )


async def grade_submission(
    db: AsyncSession,
    user: User,
    req: SubmissionCreate,
) -> SubmissionDetailResponse:
    query = (
        select(CodingProblem)
        .where(CodingProblem.id == req.problem_id)
        .options(selectinload(CodingProblem.test_cases))
    )
    res = await db.execute(query)
    problem = res.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding problem not found")

    # Validate attempt authorization and status if tied to an assessment
    if req.attempt_id:
        from app.db.models.attempt import AttemptStatus
        from app.services.attempt_service import _calc_time_remaining

        att_q = (
            select(AssessmentAttempt)
            .where(AssessmentAttempt.id == req.attempt_id)
            .options(selectinload(AssessmentAttempt.assessment))
        )
        att_res = await db.execute(att_q)
        attempt = att_res.scalar_one_or_none()
        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment attempt not found")
        if user.role not in (UserRole.teacher, UserRole.admin) and attempt.student_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to submit code for this attempt")
        if attempt.status != AttemptStatus.in_progress:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot submit to attempt in status {attempt.status.value}")
        if attempt.assessment and _calc_time_remaining(attempt, attempt.assessment.duration_minutes) <= 0:
            attempt.status = AttemptStatus.expired
            await db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assessment time limit has expired")

    # Create submission record in queued/running state
    submission = Submission(
        attempt_id=req.attempt_id,
        problem_id=req.problem_id,
        student_id=user.id,
        language=req.language,
        source_code=req.source_code,
        status=SubmissionStatus.running,
    )
    db.add(submission)
    await db.flush()

    # Run against all test cases (both public and hidden)
    cases_payload = [
        {
            "id": tc.id,
            "input_data": tc.input_data,
            "expected_output": tc.expected_output,
            "weight": tc.weight,
        }
        for tc in problem.test_cases
    ]

    batch_res = await run_batch_code(
        language=req.language,
        source_code=req.source_code,
        test_cases=cases_payload,
        time_limit_ms=problem.time_limit_ms,
        memory_limit_mb=problem.memory_limit_mb,
    )

    total_time_ms = 0
    passed_all = True
    overall_verdict = batch_res.get("overall_verdict", "wrong_answer")

    test_results = []
    earned_weight = 0.0
    total_weight = sum(tc.weight for tc in problem.test_cases) or 1.0

    for tc, r in zip(problem.test_cases, batch_res.get("results", [])):
        v_str = r.get("verdict", "wrong_answer")
        try:
            verdict_enum = Verdict(v_str)
        except Exception:
            verdict_enum = Verdict.wrong_answer

        p_status = r.get("passed", False)
        if not p_status:
            passed_all = False
        else:
            earned_weight += tc.weight

        exec_ms = r.get("execution_time_ms", 0)
        total_time_ms += exec_ms

        sub_res = SubmissionTestResult(
            submission_id=submission.id,
            test_case_id=tc.id,
            verdict=verdict_enum,
            execution_time_ms=exec_ms,
            actual_output=r.get("stdout"),
            error_message=r.get("stderr"),
            passed=p_status,
            is_hidden=tc.is_hidden,
        )
        db.add(sub_res)
        test_results.append(sub_res)

    # Calculate final problem score (out of 100 or mapped to assessment points)
    final_score = (earned_weight / total_weight) * 100.0

    try:
        submission.verdict = Verdict(overall_verdict)
    except Exception:
        submission.verdict = Verdict.wrong_answer

    submission.status = SubmissionStatus.evaluated
    submission.score = final_score
    submission.execution_time_ms = total_time_ms

    # If linked to an assessment attempt, update the corresponding AttemptAnswer
    if req.attempt_id:
        aq_query = (
            select(AssessmentQuestion)
            .join(AssessmentAttempt, AssessmentAttempt.assessment_id == AssessmentQuestion.assessment_id)
            .where(
                AssessmentAttempt.id == req.attempt_id,
                AssessmentQuestion.problem_id == req.problem_id,
            )
        )
        aq_res = await db.execute(aq_query)
        aq = aq_res.scalar_one_or_none()
        if aq:
            ans_query = select(AttemptAnswer).where(
                AttemptAnswer.attempt_id == req.attempt_id,
                AttemptAnswer.assessment_question_id == aq.id,
            )
            ans_res = await db.execute(ans_query)
            ans = ans_res.scalar_one_or_none()
            if not ans:
                ans = AttemptAnswer(
                    attempt_id=req.attempt_id,
                    assessment_question_id=aq.id,
                )
                db.add(ans)

            ans.code_answer = req.source_code
            ans.language = req.language
            # Scale score to question's point value
            ans.score = (final_score / 100.0) * aq.points
            ans.auto_graded = True

    await db.commit()
    return await get_submission_detail(db, submission.id, user)


async def get_submission_detail(db: AsyncSession, submission_id: str, user: User) -> SubmissionDetailResponse:
    query = (
        select(Submission)
        .where(Submission.id == submission_id)
        .options(
            selectinload(Submission.test_results),
            selectinload(Submission.student),
            selectinload(Submission.problem),
        )
    )
    res = await db.execute(query)
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    is_teacher = user.role in (UserRole.teacher, UserRole.admin)
    if not is_teacher and sub.student_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    tr_responses = []
    for tr in sub.test_results:
        # Mask hidden test case output for students!
        actual_out = tr.actual_output if (is_teacher or not tr.is_hidden) else None
        err_msg = tr.error_message if (is_teacher or not tr.is_hidden) else None
        tr_responses.append(
            SubmissionTestResultResponse(
                id=tr.id,
                test_case_id=tr.test_case_id,
                verdict=tr.verdict,
                execution_time_ms=tr.execution_time_ms,
                actual_output=actual_out,
                error_message=err_msg,
                passed=tr.passed,
                is_hidden=tr.is_hidden,
            )
        )

    return SubmissionDetailResponse(
        id=sub.id,
        attempt_id=sub.attempt_id,
        problem_id=sub.problem_id,
        student_id=sub.student_id,
        language=sub.language,
        status=sub.status,
        verdict=sub.verdict,
        score=sub.score,
        execution_time_ms=sub.execution_time_ms,
        memory_kb=sub.memory_kb,
        error_output=sub.error_output,
        created_at=sub.created_at,
        source_code=sub.source_code,
        student_name=sub.student.full_name if sub.student else None,
        student_email=sub.student.email if sub.student else None,
        problem_title=sub.problem.title if sub.problem else None,
        test_results=tr_responses,
    )


async def list_submissions(
    db: AsyncSession,
    user: User,
    attempt_id: Optional[str] = None,
    problem_id: Optional[str] = None,
) -> List[SubmissionResponse]:
    is_teacher = user.role in (UserRole.teacher, UserRole.admin)
    query = (
        select(Submission)
        .options(selectinload(Submission.test_results))
        .order_by(Submission.created_at.desc())
    )

    if not is_teacher:
        query = query.where(Submission.student_id == user.id)
    if attempt_id:
        query = query.where(Submission.attempt_id == attempt_id)
    if problem_id:
        query = query.where(Submission.problem_id == problem_id)

    res = await db.execute(query)
    subs = res.scalars().all()

    results = []
    for sub in subs:
        tr_responses = [
            SubmissionTestResultResponse(
                id=tr.id,
                test_case_id=tr.test_case_id,
                verdict=tr.verdict,
                execution_time_ms=tr.execution_time_ms,
                actual_output=tr.actual_output if (is_teacher or not tr.is_hidden) else None,
                error_message=tr.error_message if (is_teacher or not tr.is_hidden) else None,
                passed=tr.passed,
                is_hidden=tr.is_hidden,
            )
            for tr in sub.test_results
        ]
        results.append(
            SubmissionResponse(
                id=sub.id,
                attempt_id=sub.attempt_id,
                problem_id=sub.problem_id,
                student_id=sub.student_id,
                language=sub.language,
                status=sub.status,
                verdict=sub.verdict,
                score=sub.score,
                execution_time_ms=sub.execution_time_ms,
                memory_kb=sub.memory_kb,
                error_output=sub.error_output,
                created_at=sub.created_at,
                test_results=tr_responses,
            )
        )
    return results

