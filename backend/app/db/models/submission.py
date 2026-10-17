import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING
import uuid

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.db.models.user import utcnow, new_uuid

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.attempt import AssessmentAttempt
    from app.db.models.coding import CodingProblem, TestCase


class SubmissionStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    evaluated = "evaluated"
    system_error = "system_error"


class Verdict(str, enum.Enum):
    accepted = "accepted"
    wrong_answer = "wrong_answer"
    compilation_error = "compilation_error"
    runtime_error = "runtime_error"
    time_limit_exceeded = "time_limit_exceeded"
    memory_limit_exceeded = "memory_limit_exceeded"
    output_limit_exceeded = "output_limit_exceeded"
    system_error = "system_error"
    runner_unavailable = "runner_unavailable"


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    attempt_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("assessment_attempts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    problem_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("coding_problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    language: Mapped[str] = mapped_column(String(32), nullable=False)
    source_code: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[SubmissionStatus] = mapped_column(
        Enum(SubmissionStatus), nullable=False, default=SubmissionStatus.queued
    )
    verdict: Mapped[Verdict | None] = mapped_column(Enum(Verdict), nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    execution_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    memory_kb: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )

    # Relationships
    attempt: Mapped["AssessmentAttempt | None"] = relationship("AssessmentAttempt", back_populates="submissions")
    problem: Mapped["CodingProblem"] = relationship("CodingProblem")
    student: Mapped["User"] = relationship("User")
    test_results: Mapped[list["SubmissionTestResult"]] = relationship(
        "SubmissionTestResult",
        back_populates="submission",
        cascade="all, delete-orphan",
    )


class SubmissionTestResult(Base):
    __tablename__ = "submission_test_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    submission_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    test_case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    verdict: Mapped[Verdict] = mapped_column(Enum(Verdict), nullable=False)
    execution_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    passed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    submission: Mapped["Submission"] = relationship("Submission", back_populates="test_results")
    test_case: Mapped["TestCase"] = relationship("TestCase")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(String(64), nullable=False)  # score_override, result_release, etc.
    target_type: Mapped[str] = mapped_column(String(64), nullable=False)  # attempt, submission, assessment
    target_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )

    user: Mapped["User"] = relationship("User")
