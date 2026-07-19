from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.database import get_db
from app.models.entities import Conversation, Message, User
from app.core.auth import get_current_user

router = APIRouter()


@router.get("/history")
async def get_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total = (await db.execute(
        select(func.count(Conversation.id)).where(Conversation.user_id == user.id)
    )).scalar()
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    convs = result.scalars().all()
    return {
        "items": [{"id": c.id, "title": c.title, "created_at": c.created_at.isoformat()} for c in convs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/messages/{conversation_id}")
async def get_messages(
    conversation_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total = (await db.execute(
        select(func.count(Message.id)).where(Message.conversation_id == conversation_id)
    )).scalar()
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    msgs = result.scalars().all()
    return {
        "items": [{
            "id": m.id, "role": m.role, "content": m.content,
            "audio_url": m.audio_url, "feedback": m.feedback,
            "created_at": m.created_at.isoformat()
        } for m in msgs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
