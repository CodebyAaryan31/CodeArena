from typing import List, Dict, Any
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.assessment import Assessment, AssessmentQuestion
from app.db.models.attempt import AssessmentAttempt, AttemptAnswer, AttemptStatus
from app.db.models.question import Question
from app.db.models.coding import CodingProblem
from app.db.models.user import User
from app.schemas.analytics import (
    AssessmentAnalyticsResponse,
    ScoreBucket,
    QuestionAccuracy,
    LeaderboardEntry,
)


async def get_assessment_analytics(db: AsyncSession, assessment_id: str) -> AssessmentAnalyticsResponse:
    # 1. Fetch assessment
    q = (
        select(Assessment)
        .where(Assessment.id == assessment_id)
        .options(
            selectinload(Assessment.questions).selectinload(AssessmentQuestion.question),
            selectinload(Assessment.questions).selectinload(AssessmentQuestion.problem),
        )
    )
    res = await db.execute(q)
    assessment = res.scalar_one_or_none()
    if not assessment:
        return AssessmentAnalyticsResponse(
            assessment_id=assessment_id,
            title="Unknown",
            total_assigned=0,
            total_submissions=0,
            completion_rate=0.0,
            average_score=0.0,
            highest_score=0.0,
            lowest_score=0.0,
            pass_rate=0.0,
        )

    # 2. Fetch attempts
    att_q = (
        select(AssessmentAttempt)
        .where(AssessmentAttempt.assessment_id == assessment_id)
        .options(selectinload(AssessmentAttempt.answers))
    )
    att_res = await db.execute(att_q)
    attempts = att_res.scalars().all()

    total_assigned = len(attempts)
    submitted = [a for a in attempts if a.status in (AttemptStatus.submitted, AttemptStatus.evaluated)]
    total_submissions = len(submitted)

    completion_rate = (total_submissions / total_assigned * 100.0) if total_assigned > 0 else 0.0

    scores = [a.total_score for a in submitted if a.total_score is not None]
    avg_score = (sum(scores) / len(scores)) if scores else 0.0
    hi_score = max(scores) if scores else 0.0
    lo_score = min(scores) if scores else 0.0

    passed_count = sum(1 for a in submitted if a.passed)
    pass_rate = (passed_count / total_submissions * 100.0) if total_submissions > 0 else 0.0

    # 3. Score distribution buckets: 0-20%, 21-40%, 41-60%, 61-80%, 81-100%
    max_pts = sum(aq.points for aq in assessment.questions) or 100.0
    buckets = [
        {"range_label": "0 - 20%", "count": 0},
        {"range_label": "21 - 40%", "count": 0},
        {"range_label": "41 - 60%", "count": 0},
        {"range_label": "61 - 80%", "count": 0},
        {"range_label": "81 - 100%", "count": 0},
    ]

    for s in scores:
        pct = (s / max_pts) * 100.0
        if pct <= 20:
            buckets[0]["count"] += 1
        elif pct <= 40:
            buckets[1]["count"] += 1
        elif pct <= 60:
            buckets[2]["count"] += 1
        elif pct <= 80:
            buckets[3]["count"] += 1
        else:
            buckets[4]["count"] += 1

    score_dist = [ScoreBucket(**b) for b in buckets]

    # 4. Question performance
    q_performance = []
    for aq in assessment.questions:
        q_title = "Unknown"
        q_type = "coding"
        if aq.question:
            q_title = aq.question.title
            q_type = aq.question.type.value
        elif aq.problem:
            q_title = aq.problem.title
            q_type = "programming"

        # Count answers
        total_ans = 0
        correct_ans = 0
        for att in submitted:
            ans = next((a for a in att.answers if a.assessment_question_id == aq.id), None)
            if ans:
                total_ans += 1
                if ans.score and ans.score >= (aq.points * 0.9):
                    correct_ans += 1

        acc_pct = (correct_ans / total_ans * 100.0) if total_ans > 0 else 0.0
        q_performance.append(
            QuestionAccuracy(
                question_id=aq.id,
                title=q_title,
                type=q_type,
                accuracy_percentage=round(acc_pct, 1),
                total_responses=total_ans,
            )
        )

    return AssessmentAnalyticsResponse(
        assessment_id=assessment.id,
        title=assessment.title,
        total_assigned=total_assigned,
        total_submissions=total_submissions,
        completion_rate=round(completion_rate, 1),
        average_score=round(avg_score, 1),
        highest_score=round(hi_score, 1),
        lowest_score=round(lo_score, 1),
        pass_rate=round(pass_rate, 1),
        score_distribution=score_dist,
        question_performance=q_performance,
    )


async def get_assessment_leaderboard(db: AsyncSession, assessment_id: str, user: User) -> List[LeaderboardEntry]:
    # 1. Fetch assessment
    a_res = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = a_res.scalar_one_or_none()
    if not assessment:
        return []

    is_teacher = user.role in ("teacher", "admin")
    # If student and results not yet released by teacher, honor privacy and return empty
    if not is_teacher and not assessment.results_released:
        return []

    query = (
        select(AssessmentAttempt)
        .where(
            AssessmentAttempt.assessment_id == assessment_id,
            AssessmentAttempt.status.in_([AttemptStatus.submitted, AttemptStatus.evaluated]),
        )
        .options(
            selectinload(AssessmentAttempt.student),
            selectinload(AssessmentAttempt.assessment),
        )
    )
    res = await db.execute(query)
    attempts = list(res.scalars().all())
    if not attempts:
        return []

    # Sort: Primary by score descending, secondary tie-breaker by completion duration ascending
    def sort_key(att: AssessmentAttempt):
        score = att.total_score if att.total_score is not None else -1.0
        dur_sec = 9999999.0
        if att.submitted_at and att.started_at:
            dur_sec = (att.submitted_at - att.started_at).total_seconds()
        return (-score, dur_sec)

    attempts.sort(key=sort_key)

    entries = []
    for rank, att in enumerate(attempts, start=1):
        score = att.total_score or 0.0
        max_score = att.max_possible_score or 100.0
        pct = (score / max_score * 100.0) if max_score > 0 else 0.0

        dur_min = 0.0
        if att.submitted_at and att.started_at:
            dur_min = (att.submitted_at - att.started_at).total_seconds() / 60.0

        entries.append(
            LeaderboardEntry(
                rank=rank,
                student_id=att.student_id,
                student_name=att.student.full_name if att.student else "Student",
                score=score,
                max_score=max_score,
                percentage=round(pct, 1),
                completion_time_minutes=round(dur_min, 1),
            )
        )

    return entries

