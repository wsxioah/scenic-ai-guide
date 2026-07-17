from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.database import get_db
from app.models.entities import User, ScenicSpot, KnowledgePoint, Conversation, Message, Announcement
from app.core.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/dashboard")
async def dashboard(db: AsyncSession = Depends(get_db)):
    """管理后台仪表盘数据"""
    # 统计数据
    user_count = (await db.execute(select(func.count(User.id)))).scalar()
    spot_count = (await db.execute(select(func.count(ScenicSpot.id)))).scalar()
    knowledge_count = (await db.execute(select(func.count(KnowledgePoint.id)))).scalar()
    conversation_count = (await db.execute(select(func.count(Conversation.id)))).scalar()
    message_count = (await db.execute(select(func.count(Message.id)))).scalar()

    # 热门景点 Top 5
    result = await db.execute(
        select(ScenicSpot.name, ScenicSpot.pv, ScenicSpot.score)
        .order_by(ScenicSpot.pv.desc()).limit(5)
    )
    hot_spots = [{"name": r[0], "pv": r[1], "score": r[2]} for r in result.fetchall()]

    # 近7天对话趋势
    from datetime import datetime, timedelta
    trend = []
    for i in range(6, -1, -1):
        date = datetime.utcnow() - timedelta(days=i)
        date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        date_end = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        cnt = (await db.execute(
            select(func.count(Conversation.id))
            .where(Conversation.created_at.between(date_start, date_end))
        )).scalar()
        trend.append({"date": date.strftime("%m-%d"), "count": cnt})

    return {
        "stats": {
            "users": user_count,
            "scenic_spots": spot_count,
            "knowledge_points": knowledge_count,
            "conversations": conversation_count,
            "messages": message_count,
        },
        "hot_spots": hot_spots,
        "conversation_trend": trend,
    }


@router.get("/users")
async def list_users(page: int = 1, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).order_by(User.id.desc())
        .offset((page - 1) * 20).limit(20)
    )
    users = result.scalars().all()
    return [{
        "id": u.id, "phone": u.phone, "nickname": u.nickname,
        "created_at": u.created_at.isoformat(),
    } for u in users]


@router.get("/conversations/stats")
async def conversation_stats(db: AsyncSession = Depends(get_db)):
    """对话统计分析"""
    # 常见问题统计（按消息开头聚类）
    result = await db.execute(
        select(Message.content)
        .where(Message.role == "user")
        .order_by(Message.created_at.desc()).limit(100)
    )
    messages = [r[0][:50] for r in result.fetchall()]

    # 满意度
    positive = (await db.execute(
        select(func.count(Message.id)).where(Message.feedback == 1)
    )).scalar()
    negative = (await db.execute(
        select(func.count(Message.id)).where(Message.feedback == -1)
    )).scalar()

    return {
        "recent_queries": messages[:20],
        "satisfaction": {
            "positive": positive,
            "negative": negative,
            "rate": round(positive / (positive + negative) * 100, 1) if (positive + negative) > 0 else 0,
        }
    }


@router.post("/announcements")
async def create_announcement(
    title: str, content: str, type: str = "normal",
    db: AsyncSession = Depends(get_db),
):
    a = Announcement(title=title, content=content, type=type)
    db.add(a)
    await db.commit()
    return {"id": a.id, "message": "公告发布成功"}
