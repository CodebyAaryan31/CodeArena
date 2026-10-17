from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.assessment import Assessment
from app.db.models.attempt import AssessmentAttempt, AttemptStatus
from app.db.models.submission import AuditLog, Submission
from app.db.models.user import User, UserRole
from app.schemas.review import ScoreOverrideRequest, FeedbackRequest, ResultReleaseRequest, AuditLogResponse
from app.schemas.attempt import AttemptResponse


async def list_submissions_for_teacher(
    db: AsyncSession,
    assessment_id: Optional[str] = None,
    student_id: Optional[str] = None,
) -> List[dict]:
    query = (
        select(AssessmentAttempt)
        .options(
            selectinload(AssessmentAttempt.student),
            selectinload(AssessmentAttempt.assessment),
            selectinload(AssessmentAttempt.integrity_events),
        )
        .order_by(AssessmentAttempt.started_at.desc())
    )
    if assessment_id:
        query = query.where(AssessmentAttempt.assessment_id == assessment_id)
    if student_id:
        query = query.where(AssessmentAttempt.student_id == student_id)

    res = await db.execute(query)
    attempts = res.scalars().all()

    return [
        {
            "attempt_id": att.id,
            "assessment_id": att.assessment_id,
            "assessment_title": att.assessment.title if att.assessment else "Unknown",
            "student_id": att.student_id,
            "student_name": att.student.full_name if att.student else "Unknown",
            "student_email": att.student.email if att.student else "Unknown",
            "attempt_number": att.attempt_number,
            "status": att.status,
            "started_at": att.started_at,
            "submitted_at": att.submitted_at,
            "total_score": att.total_score,
            "max_possible_score": att.max_possible_score,
            "passed": att.passed,
            "feedback": att.feedback,
            "results_released": att.assessment.results_released if att.assessment else False,
            "integrity_events_count": len(att.integrity_events) if att.integrity_events else 0,
        }
        for att in attempts
    ]


async def override_attempt_score(
    db: AsyncSession,
    teacher: User,
    req: ScoreOverrideRequest,
) -> dict:
    query = select(AssessmentAttempt).where(AssessmentAttempt.id == req.attempt_id).options(selectinload(AssessmentAttempt.assessment))
    res = await db.execute(query)
    att = res.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    old_score_str = str(att.total_score) if att.total_score is not None else "None"
    new_score_str = str(req.new_score)

    # Record AuditLog
    audit = AuditLog(
        user_id=teacher.id,
        action="score_override",
        target_type="attempt",
        target_id=att.id,
        old_value=old_score_str,
        new_value=new_score_str,
        reason=req.reason,
    )
    db.add(audit)

    att.total_score = req.new_score
    if att.max_possible_score and att.max_possible_score > 0:
        pct = (req.new_score / att.max_possible_score) * 100.0
        pass_pct = att.assessment.pass_percentage if att.assessment else 50.0
        att.passed = pct >= pass_pct

    await db.commit()
    return {
        "status": "ok",
        "attempt_id": att.id,
        "new_score": att.total_score,
        "passed": att.passed,
        "audit_id": audit.id,
    }


async def add_attempt_feedback(
    db: AsyncSession,
    teacher: User,
    req: FeedbackRequest,
) -> dict:
    query = select(AssessmentAttempt).where(AssessmentAttempt.id == req.attempt_id)
    res = await db.execute(query)
    att = res.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    att.feedback = req.feedback
    await db.commit()
    return {"status": "ok", "attempt_id": att.id, "feedback": att.feedback}


async def release_assessment_results(
    db: AsyncSession,
    teacher: User,
    req: ResultReleaseRequest,
) -> dict:
    query = select(Assessment).where(Assessment.id == req.assessment_id)
    res = await db.execute(query)
    a = res.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    if a.teacher_id != teacher.id and teacher.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    old_val = str(a.results_released)
    a.results_released = req.release

    audit = AuditLog(
        user_id=teacher.id,
        action="result_release",
        target_type="assessment",
        target_id=a.id,
        old_value=old_val,
        new_value=str(req.release),
        reason=f"Results {'released' if req.release else 'hidden'} by teacher",
    )
    db.add(audit)
    await db.commit()
    return {"status": "ok", "assessment_id": a.id, "results_released": a.results_released}


async def list_audit_logs(
    db: AsyncSession,
    target_id: Optional[str] = None,
) -> List[AuditLogResponse]:
    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    if target_id:
        query = query.where(AuditLog.target_id == target_id)
    res = await db.execute(query)
    logs = res.scalars().all()
    return [AuditLogResponse.model_validate(log) for log in logs]
