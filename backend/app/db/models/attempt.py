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
    from app.db.models.assessment import Assessment, AssessmentQuestion
    from app.db.models.submission import Submission


class AttemptStatus(str, enum.Enum):
    in_progress = "in_progress"
    submitted = "submitted"
    expired = "expired"
    evaluated = "evaluated"


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    assessment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[AttemptStatus] = mapped_column(
        Enum(AttemptStatus), nullable=False, default=AttemptStatus.in_progress
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_possible_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    assessment: Mapped["Assessment"] = relationship("Assessment", back_populates="attempts")
    student: Mapped["User"] = relationship("User")
    answers: Mapped[list["AttemptAnswer"]] = relationship(
        "AttemptAnswer",
        back_populates="attempt",
        cascade="all, delete-orphan",
    )
    submissions: Mapped[list["Submission"]] = relationship(
        "Submission",
        back_populates="attempt",
        cascade="all, delete-orphan",
    )
    integrity_events: Mapped[list["ExamIntegrityEvent"]] = relationship(
        "ExamIntegrityEvent",
        back_populates="attempt",
        cascade="all, delete-orphan",
        order_by="ExamIntegrityEvent.timestamp.desc()",
    )


class ExamIntegrityEvent(Base):
    __tablename__ = "exam_integrity_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    attempt_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("assessment_attempts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)  # fullscreen_exit, visibility_hidden, window_blur
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )

    attempt: Mapped["AssessmentAttempt"] = relationship("AssessmentAttempt", back_populates="integrity_events")


class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    attempt_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("assessment_attempts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assessment_question_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("assessment_questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    selected_option_ids: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array string
    text_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    code_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    language: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    auto_graded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now()
    )

    attempt: Mapped["AssessmentAttempt"] = relationship("AssessmentAttempt", back_populates="answers")
    assessment_question: Mapped["AssessmentQuestion"] = relationship("AssessmentQuestion")
