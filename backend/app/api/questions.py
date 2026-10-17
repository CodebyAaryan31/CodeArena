from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, RequireTeacher
from app.db.session import get_db
from app.db.models.question import Difficulty, QuestionType
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionResponse
from app.services import question_service

router = APIRouter(prefix="/questions", tags=["questions"])


@router.get("/", response_model=List[QuestionResponse])
async def list_questions(
    current_user: CurrentUser,
    topic: Optional[str] = None,
    difficulty: Optional[Difficulty] = None,
    type: Optional[QuestionType] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    return await question_service.list_questions(
        db=db,
        user=current_user,
        topic=topic,
        difficulty=difficulty,
        q_type=type,
        search=search,
    )


@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(
    question_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    return await question_service.get_question(db, question_id, current_user)


@router.post("/", response_model=QuestionResponse, status_code=201)
async def create_question(
    req: QuestionCreate,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    return await question_service.create_question(db, current_user.id, req)


@router.patch("/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: str,
    req: QuestionUpdate,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    return await question_service.update_question(db, question_id, req, current_user)


@router.delete("/{question_id}", status_code=204)
async def delete_question(
    question_id: str,
    current_user: RequireTeacher,
    db: AsyncSession = Depends(get_db),
):
    await question_service.delete_question(db, question_id)
