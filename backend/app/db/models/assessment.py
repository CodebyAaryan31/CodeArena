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
    from app.db.models.question import Question
    from app.db.models.coding import CodingProblem
    from app.db.models.attempt import AssessmentAttempt


class AssessmentState(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    published = "published"
    archived = "archived"


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    teacher_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    state: Mapped[AssessmentState] = mapped_column(
        Enum(AssessmentState), nullable=False, default=AssessmentState.draft
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    pass_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=50.0)
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    results_released: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now()
    )

    # Relationships
    teacher: Mapped["User"] = relationship("User", foreign_keys=[teacher_id])
    questions: Mapped[list["AssessmentQuestion"]] = relationship(
        "AssessmentQuestion",
        back_populates="assessment",
        cascade="all, delete-orphan",
        order_by="AssessmentQuestion.order_index",
    )
    attempts: Mapped[list["AssessmentAttempt"]] = relationship(
        "AssessmentAttempt",
        back_populates="assessment",
        cascade="all, delete-orphan",
    )

    def is_open(self) -> bool:
        """Derived runtime state check: open only if published/scheduled and within time window."""
        if self.state not in (AssessmentState.published, AssessmentState.scheduled):
            return False
        now = datetime.now(timezone.utc)
        if self.start_time:
            st = self.start_time if self.start_time.tzinfo else self.start_time.replace(tzinfo=timezone.utc)
            if st > now:
                return False
        if self.end_time:
            et = self.end_time if self.end_time.tzinfo else self.end_time.replace(tzinfo=timezone.utc)
            if et < now:
                return False
        return True

    def is_closed(self) -> bool:
        """Check if assessment has passed its deadline."""
        if self.state == AssessmentState.archived:
            return True
        now = datetime.now(timezone.utc)
        if self.end_time:
            et = self.end_time if self.end_time.tzinfo else self.end_time.replace(tzinfo=timezone.utc)
            return et < now
        return False

    def is_upcoming(self) -> bool:
        """Check if assessment is scheduled for a future start time."""
        now = datetime.now(timezone.utc)
        if self.start_time:
            st = self.start_time if self.start_time.tzinfo else self.start_time.replace(tzinfo=timezone.utc)
            return st > now and self.state in (AssessmentState.scheduled, AssessmentState.published)
        return False


class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    assessment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("questions.id", ondelete="SET NULL"), nullable=True
    )
    problem_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("coding_problems.id", ondelete="SET NULL"), nullable=True
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    points: Mapped[float] = mapped_column(Float, nullable=False, default=10.0)

    # Relationships
    assessment: Mapped["Assessment"] = relationship("Assessment", back_populates="questions")
    question: Mapped["Question | None"] = relationship("Question")
    problem: Mapped["CodingProblem | None"] = relationship("CodingProblem")


class ClassGroup(Base):
    __tablename__ = "classes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    teacher_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )

    teacher: Mapped["User"] = relationship("User")
    enrollments: Mapped[list["Enrollment"]] = relationship(
        "Enrollment", back_populates="class_group", cascade="all, delete-orphan"
    )


class Enrollment(Base):
    __tablename__ = "enrollments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    class_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )

    class_group: Mapped["ClassGroup"] = relationship("ClassGroup", back_populates="enrollments")
    student: Mapped["User"] = relationship("User")
