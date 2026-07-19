from fastapi import APIRouter, Depends, Query
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.models.database import get_db
from app.models.entities import User, ScenicSpot, KnowledgePoint, Conversation, Message, Announcement, TouristBehavior, FAQ
from app.core.auth import get_current_user

logger = logging.getLogger(__name__)

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


@router.get("/dashboard/full")
async def dashboard_full(db: AsyncSession = Depends(get_db)):
    """全量数据看板 — 仅灵山胜境相关数据"""
    from datetime import datetime, timedelta

    # 子查询：仅灵山胜境景点名称
    lingshan_names = select(ScenicSpot.name)
    lingshan_filter = TouristBehavior.attraction_name.in_(lingshan_names)

    # ── 基础统计 ──
    user_count = (await db.execute(select(func.count(User.id)))).scalar()
    spot_count = (await db.execute(select(func.count(ScenicSpot.id)))).scalar()
    knowledge_count = (await db.execute(select(func.count(KnowledgePoint.id)))).scalar()
    conversation_count = (await db.execute(select(func.count(Conversation.id)))).scalar()
    message_count = (await db.execute(select(func.count(Message.id)))).scalar()
    behavior_count = (await db.execute(
        select(func.count(TouristBehavior.id)).where(lingshan_filter)
    )).scalar()

    # ── 游客年龄分布 ──
    age_ranges = [
        (0, 18, '0-18'), (19, 25, '19-25'), (26, 35, '26-35'),
        (36, 45, '36-45'), (46, 55, '46-55'), (56, 99, '56+'),
    ]
    age_dist = []
    for lo, hi, label in age_ranges:
        cnt = (await db.execute(
            select(func.count(TouristBehavior.id))
            .where(lingshan_filter, TouristBehavior.age.between(lo, hi))
        )).scalar()
        age_dist.append({"range": label, "count": cnt})

    # ── 性别分布 ──
    male = (await db.execute(
        select(func.count(TouristBehavior.id))
        .where(lingshan_filter, TouristBehavior.gender == '男')
    )).scalar()
    female = (await db.execute(
        select(func.count(TouristBehavior.id))
        .where(lingshan_filter, TouristBehavior.gender == '女')
    )).scalar()

    # ── 满意度分布 ──
    sat_dist = []
    for rating in range(1, 6):
        cnt = (await db.execute(
            select(func.count(TouristBehavior.id))
            .where(lingshan_filter, TouristBehavior.satisfaction == rating)
        )).scalar()
        sat_dist.append({"rating": rating, "count": cnt})
    avg_sat = (await db.execute(
        select(func.avg(TouristBehavior.satisfaction)).where(lingshan_filter)
    )).scalar()

    # ── 消费分析 ──
    cost_keys = [
        ('ticket_cost', '门票'), ('food_cost', '餐饮'),
        ('shopping_cost', '购物'), ('transport_cost', '交通'),
        ('entertainment_cost', '娱乐'),
    ]
    cost_breakdown = []
    for col, label in cost_keys:
        avg_val = (await db.execute(
            select(func.avg(getattr(TouristBehavior, col))).where(lingshan_filter)
        )).scalar()
        total_val = (await db.execute(
            select(func.sum(getattr(TouristBehavior, col))).where(lingshan_filter)
        )).scalar()
        cost_breakdown.append({
            "category": label,
            "avg": round(float(avg_val), 1) if avg_val else 0,
            "total": round(float(total_val), 0) if total_val else 0,
        })
    avg_total_cost = (await db.execute(
        select(func.avg(TouristBehavior.total_cost)).where(lingshan_filter)
    )).scalar()

    # ── 热门景点 TOP10 (仅灵山胜境16个景点) ──
    result = await db.execute(
        select(
            TouristBehavior.attraction_name,
            func.count(TouristBehavior.id).label('cnt'),
            func.avg(TouristBehavior.satisfaction).label('sat'),
            func.avg(TouristBehavior.total_cost).label('cost'),
            func.avg(TouristBehavior.stay_duration).label('stay'),
        )
        .where(lingshan_filter)
        .group_by(TouristBehavior.attraction_name)
        .order_by(func.count(TouristBehavior.id).desc())
        .limit(10)
    )
    hot_attractions = [
        {
            "name": r[0], "visit_count": r[1],
            "avg_satisfaction": round(float(r[2]), 1) if r[2] else 0,
            "avg_cost": round(float(r[3]), 0) if r[3] else 0,
            "avg_stay_min": round(float(r[4]), 1) if r[4] else 0,
        }
        for r in result.fetchall()
    ]

    # ── 景区类型分布 ──
    result = await db.execute(
        select(
            TouristBehavior.attraction_type,
            func.count(TouristBehavior.id).label('cnt'),
            func.avg(TouristBehavior.satisfaction).label('sat'),
        )
        .where(lingshan_filter)
        .group_by(TouristBehavior.attraction_type)
        .order_by(func.count(TouristBehavior.id).desc())
    )
    type_stats = [
        {"type": r[0], "count": r[1], "avg_satisfaction": round(float(r[2]), 1) if r[2] else 0}
        for r in result.fetchall()
    ]

    # ── 团体规模分布 ──
    result = await db.execute(
        select(
            TouristBehavior.group_size,
            func.count(TouristBehavior.id),
        )
        .where(lingshan_filter)
        .group_by(TouristBehavior.group_size)
        .order_by(TouristBehavior.group_size)
    )
    group_dist = [{"size": r[0], "count": r[1]} for r in result.fetchall()]

    # ── 近30天对话趋势 ──
    trend = []
    for i in range(29, -1, -1):
        date = datetime.utcnow() - timedelta(days=i)
        date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        date_end = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        cnt = (await db.execute(
            select(func.count(Conversation.id))
            .where(Conversation.created_at.between(date_start, date_end))
        )).scalar()
        trend.append({"date": date.strftime("%m-%d"), "count": cnt})

    # ── 知识库来源统计 ──
    result = await db.execute(
        select(
            func.coalesce(KnowledgePoint.source, '未分类'),
            func.count(KnowledgePoint.id),
        )
        .group_by(KnowledgePoint.source)
        .order_by(func.count(KnowledgePoint.id).desc())
    )
    knowledge_sources = [{"source": r[0], "count": r[1]} for r in result.fetchall()]

    # ── 问答满意度 ──
    pos = (await db.execute(
        select(func.count(Message.id)).where(Message.feedback == 1)
    )).scalar()
    neg = (await db.execute(
        select(func.count(Message.id)).where(Message.feedback == -1)
    )).scalar()
    total_feedback = pos + neg

    # ── 最近热门问题 ──
    result = await db.execute(
        select(Message.content)
        .where(Message.role == "user")
        .order_by(Message.created_at.desc()).limit(20)
    )
    recent_queries = [r[0][:60] for r in result.fetchall()]

    return {
        "stats": {
            "users": user_count,
            "scenic_spots": spot_count,
            "knowledge_points": knowledge_count,
            "conversations": conversation_count,
            "messages": message_count,
            "behavior_records": behavior_count,
        },
        "tourist_demographics": {
            "age_distribution": age_dist,
            "gender": {"male": male, "female": female},
            "total_records": behavior_count,
        },
        "satisfaction": {
            "distribution": sat_dist,
            "average": round(float(avg_sat), 2) if avg_sat else 0,
        },
        "spending": {
            "breakdown": cost_breakdown,
            "avg_total_cost": round(float(avg_total_cost), 1) if avg_total_cost else 0,
        },
        "hot_attractions": hot_attractions,
        "type_stats": type_stats,
        "group_distribution": group_dist,
        "conversation_trend": trend,
        "knowledge_sources": knowledge_sources,
        "qa_satisfaction": {
            "positive": pos,
            "negative": neg,
            "rate": round(pos / total_feedback * 100, 1) if total_feedback > 0 else 0,
        },
        "recent_queries": recent_queries,
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


# ============ FAQ Management ============

@router.get("/faqs")
async def list_faqs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """FAQ列表（管理端，分页）"""
    query = select(FAQ)
    if category:
        query = query.where(FAQ.category == category)
    query = query.order_by(FAQ.sort_order.asc(), FAQ.id.desc())

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    faqs = result.scalars().all()
    return {
        "items": [{
            "id": f.id, "question": f.question, "answer": f.answer,
            "category": f.category, "sort_order": f.sort_order,
            "is_published": f.is_published, "created_at": f.created_at.isoformat(),
        } for f in faqs],
        "total": total, "page": page, "page_size": page_size,
    }


@router.post("/faqs")
async def create_faq(
    question: str = Query(..., min_length=1),
    answer: str = Query(..., min_length=1),
    category: str = Query("general"),
    sort_order: int = Query(0),
    is_published: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """创建FAQ"""
    faq = FAQ(
        question=question.strip(), answer=answer.strip(),
        category=category, sort_order=sort_order, is_published=is_published,
    )
    db.add(faq)
    await db.commit()
    await db.refresh(faq)
    return {"id": faq.id, "message": "FAQ创建成功"}


@router.put("/faqs/{faq_id}")
async def update_faq(
    faq_id: int,
    question: str | None = Query(None),
    answer: str | None = Query(None),
    category: str | None = Query(None),
    sort_order: int | None = Query(None),
    is_published: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """更新FAQ"""
    result = await db.execute(select(FAQ).where(FAQ.id == faq_id))
    faq = result.scalar_one_or_none()
    if not faq:
        from fastapi import HTTPException
        raise HTTPException(404, "FAQ不存在")
    if question is not None: faq.question = question.strip()
    if answer is not None: faq.answer = answer.strip()
    if category is not None: faq.category = category
    if sort_order is not None: faq.sort_order = sort_order
    if is_published is not None: faq.is_published = is_published
    await db.commit()
    await db.refresh(faq)
    return {"id": faq.id, "message": "FAQ已更新"}


@router.delete("/faqs/{faq_id}")
async def delete_faq(faq_id: int, db: AsyncSession = Depends(get_db)):
    """删除FAQ"""
    result = await db.execute(select(FAQ).where(FAQ.id == faq_id))
    faq = result.scalar_one_or_none()
    if not faq:
        from fastapi import HTTPException
        raise HTTPException(404, "FAQ不存在")
    await db.delete(faq)
    await db.commit()
    return {"message": "FAQ已删除"}
