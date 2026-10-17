from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.question import Question, QuestionOption, QuestionType, Difficulty
from app.db.models.user import User, UserRole
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionResponse, QuestionOptionResponse


async def list_questions(
    db: AsyncSession,
    user: User,
    topic: Optional[str] = None,
    difficulty: Optional[Difficulty] = None,
    q_type: Optional[QuestionType] = None,
    search: Optional[str] = None,
) -> List[QuestionResponse]:
    query = select(Question).options(selectinload(Question.options))

    if topic:
        query = query.where(Question.topic == topic)
    if difficulty:
        query = query.where(Question.difficulty == difficulty)
    if q_type:
        query = query.where(Question.type == q_type)
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(Question.title.ilike(pattern), Question.prompt.ilike(pattern)))

    query = query.order_by(Question.created_at.desc())
    result = await db.execute(query)
    questions = result.scalars().all()

    # Mask correct options if user is a student
    is_teacher = user.role in (UserRole.teacher, UserRole.admin)
    responses = []
    for q in questions:
        opt_responses = [
            QuestionOptionResponse(
                id=opt.id,
                text=opt.text,
                order_index=opt.order_index,
                is_correct=opt.is_correct if is_teacher else None,
            )
            for opt in q.options
        ]
        responses.append(
            QuestionResponse(
                id=q.id,
                creator_id=q.creator_id,
                title=q.title,
                prompt=q.prompt,
                type=q.type,
                difficulty=q.difficulty,
                topic=q.topic,
                tags=q.tags,
                code_snippet=q.code_snippet,
                solution_explanation=q.solution_explanation if is_teacher else None,
                created_at=q.created_at,
                updated_at=q.updated_at,
                options=opt_responses,
            )
        )
    return responses


async def get_question(db: AsyncSession, question_id: str, user: User) -> QuestionResponse:
    query = (
        select(Question)
        .where(Question.id == question_id)
        .options(selectinload(Question.options))
    )
    result = await db.execute(query)
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    is_teacher = user.role in (UserRole.teacher, UserRole.admin)
    opt_responses = [
        QuestionOptionResponse(
            id=opt.id,
            text=opt.text,
            order_index=opt.order_index,
            is_correct=opt.is_correct if is_teacher else None,
        )
        for opt in q.options
    ]
    return QuestionResponse(
        id=q.id,
        creator_id=q.creator_id,
        title=q.title,
        prompt=q.prompt,
        type=q.type,
        difficulty=q.difficulty,
        topic=q.topic,
        tags=q.tags,
        code_snippet=q.code_snippet,
        solution_explanation=q.solution_explanation if is_teacher else None,
        created_at=q.created_at,
        updated_at=q.updated_at,
        options=opt_responses,
    )


async def create_question(db: AsyncSession, creator_id: str, req: QuestionCreate) -> QuestionResponse:
    q = Question(
        creator_id=creator_id,
        title=req.title,
        prompt=req.prompt,
        type=req.type,
        difficulty=req.difficulty,
        topic=req.topic,
        tags=req.tags,
        code_snippet=req.code_snippet,
        solution_explanation=req.solution_explanation,
    )
    db.add(q)
    await db.flush()

    for idx, opt_in in enumerate(req.options):
        opt = QuestionOption(
            question_id=q.id,
            text=opt_in.text,
            is_correct=opt_in.is_correct,
            order_index=opt_in.order_index if opt_in.order_index is not None else idx,
        )
        db.add(opt)

    await db.commit()
    return await get_question(db, q.id, User(id=creator_id, role=UserRole.teacher))


async def update_question(db: AsyncSession, question_id: str, req: QuestionUpdate, user: User) -> QuestionResponse:
    query = (
        select(Question)
        .where(Question.id == question_id)
        .options(selectinload(Question.options))
    )
    result = await db.execute(query)
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    if req.title is not None:
        q.title = req.title
    if req.prompt is not None:
        q.prompt = req.prompt
    if req.type is not None:
        q.type = req.type
    if req.difficulty is not None:
        q.difficulty = req.difficulty
    if req.topic is not None:
        q.topic = req.topic
    if req.tags is not None:
        q.tags = req.tags
    if req.code_snippet is not None:
        q.code_snippet = req.code_snippet
    if req.solution_explanation is not None:
        q.solution_explanation = req.solution_explanation

    if req.options is not None:
        # replace options
        for opt in q.options:
            await db.delete(opt)
        for idx, opt_in in enumerate(req.options):
            new_opt = QuestionOption(
                question_id=q.id,
                text=opt_in.text,
                is_correct=opt_in.is_correct,
                order_index=opt_in.order_index if opt_in.order_index is not None else idx,
            )
            db.add(new_opt)

    await db.commit()
    return await get_question(db, q.id, user)


async def delete_question(db: AsyncSession, question_id: str):
    query = select(Question).where(Question.id == question_id)
    result = await db.execute(query)
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    await db.delete(q)
    await db.commit()
