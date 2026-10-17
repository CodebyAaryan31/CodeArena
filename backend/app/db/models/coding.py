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
from app.db.models.question import Difficulty

if TYPE_CHECKING:
    from app.db.models.user import User


class CodingProblem(Base):
    __tablename__ = "coding_problems"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    creator_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)  # Markdown
    input_format: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_format: Mapped[str | None] = mapped_column(Text, nullable=True)
    constraints: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_input: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_solution: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_solution_language: Mapped[str | None] = mapped_column(String(32), nullable=True, default="python")
    difficulty: Mapped[Difficulty] = mapped_column(Enum(Difficulty), nullable=False, default=Difficulty.easy)
    topic: Mapped[str] = mapped_column(String(100), nullable=False, default="Algorithms", index=True)
    tags: Mapped[str | None] = mapped_column(String(255), nullable=True)  # comma separated
    time_limit_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=2000)
    memory_limit_mb: Mapped[int] = mapped_column(Integer, nullable=False, default=256)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now()
    )

    # Relationships
    creator: Mapped["User"] = relationship("User")
    starter_codes: Mapped[list["StarterCode"]] = relationship(
        "StarterCode",
        back_populates="problem",
        cascade="all, delete-orphan",
    )
    test_cases: Mapped[list["TestCase"]] = relationship(
        "TestCase",
        back_populates="problem",
        cascade="all, delete-orphan",
        order_by="TestCase.order_index",
    )


class StarterCode(Base):
    __tablename__ = "starter_codes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    problem_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("coding_problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    language: Mapped[str] = mapped_column(String(32), nullable=False)  # python, cpp, javascript
    code: Mapped[str] = mapped_column(Text, nullable=False)

    problem: Mapped["CodingProblem"] = relationship("CodingProblem", back_populates="starter_codes")


class TestCase(Base):
    __tablename__ = "test_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    problem_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("coding_problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    input_data: Mapped[str] = mapped_column(Text, nullable=False)
    expected_output: Mapped[str] = mapped_column(Text, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    weight: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)

    problem: Mapped["CodingProblem"] = relationship("CodingProblem", back_populates="test_cases")
