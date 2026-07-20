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
    """全量数据看板 — 仅灵山胜境相关数据，单次请求优化"""
    from datetime import datetime, timedelta, date
    import asyncio

    # 子查询：仅灵山胜境景点名称
    lingshan_names = select(ScenicSpot.name)
    lingshan_filter = TouristBehavior.attraction_name.in_(lingshan_names)

    # ── 并行：基础统计 + 游客画像（单查询多指标） ──
    try:
        base_stats, bh_stats_raw, trend_raw, spot_type_raw, group_raw, ks_raw = await asyncio.gather(
            # 1. 基础统计（5个count）
            db.execute(select(
                func.count(User.id),
                func.count(ScenicSpot.id),
                func.count(KnowledgePoint.id),
                func.count(Conversation.id),
                func.count(Message.id),
            )),
            # 2. 游客画像总览（单查询：计数 + 年龄CASE + 性别 + 满意度 + 消费）
            db.execute(
                select(
                    func.count(TouristBehavior.id),
                    func.sum(func.if_(TouristBehavior.age.between(0, 18), 1, 0)),
                    func.sum(func.if_(TouristBehavior.age.between(19, 25), 1, 0)),
                    func.sum(func.if_(TouristBehavior.age.between(26, 35), 1, 0)),
                    func.sum(func.if_(TouristBehavior.age.between(36, 45), 1, 0)),
                    func.sum(func.if_(TouristBehavior.age.between(46, 55), 1, 0)),
                    func.sum(func.if_(TouristBehavior.age >= 56, 1, 0)),
                    func.sum(func.if_(TouristBehavior.gender == '男', 1, 0)),
                    func.sum(func.if_(TouristBehavior.gender == '女', 1, 0)),
                    func.sum(func.if_(TouristBehavior.satisfaction == 1, 1, 0)),
                    func.sum(func.if_(TouristBehavior.satisfaction == 2, 1, 0)),
                    func.sum(func.if_(TouristBehavior.satisfaction == 3, 1, 0)),
                    func.sum(func.if_(TouristBehavior.satisfaction == 4, 1, 0)),
                    func.sum(func.if_(TouristBehavior.satisfaction == 5, 1, 0)),
                    func.avg(TouristBehavior.satisfaction),
                    func.avg(TouristBehavior.ticket_cost),
                    func.sum(TouristBehavior.ticket_cost),
                    func.avg(TouristBehavior.food_cost),
                    func.sum(TouristBehavior.food_cost),
                    func.avg(TouristBehavior.shopping_cost),
                    func.sum(TouristBehavior.shopping_cost),
                    func.avg(TouristBehavior.transport_cost),
                    func.sum(TouristBehavior.transport_cost),
                    func.avg(TouristBehavior.entertainment_cost),
                    func.sum(TouristBehavior.entertainment_cost),
                    func.avg(TouristBehavior.total_cost),
                ).where(lingshan_filter)
            ),
            # 3. 近30天对话趋势
            db.execute(
                select(
                    func.date(Conversation.created_at).label('d'),
                    func.count(Conversation.id),
                )
                .where(Conversation.created_at >= datetime.utcnow() - timedelta(days=30))
                .group_by(func.date(Conversation.created_at))
                .order_by('d')
            ),
            # 4. 景区类型分布
            db.execute(
                select(
                    TouristBehavior.attraction_type,
                    func.count(TouristBehavior.id),
                    func.avg(TouristBehavior.satisfaction),
                )
                .where(lingshan_filter)
                .group_by(TouristBehavior.attraction_type)
                .order_by(func.count(TouristBehavior.id).desc())
            ),
            # 5. 团体规模分布
            db.execute(
                select(
                    TouristBehavior.group_size,
                    func.count(TouristBehavior.id),
                )
                .where(lingshan_filter)
                .group_by(TouristBehavior.group_size)
                .order_by(TouristBehavior.group_size)
            ),
            # 6. 知识库来源
            db.execute(
                select(
                    func.coalesce(KnowledgePoint.source, '未分类'),
                    func.count(KnowledgePoint.id),
                )
                .group_by(KnowledgePoint.source)
                .order_by(func.count(KnowledgePoint.id).desc())
            ),
        )
    except Exception:
        logger.exception("dashboard_full gather #1 failed")
        return {
            "stats": {"users": 0, "scenic_spots": 0, "knowledge_points": 0, "conversations": 0, "messages": 0, "behavior_records": 0},
            "tourist_demographics": {"age_distribution": [], "gender": {"male": 0, "female": 0}},
            "satisfaction": {"distribution": [], "average": 0},
            "spending": {"breakdown": [], "avg_total_cost": 0},
            "hot_attractions": [],
            "type_stats": [],
            "group_distribution": [],
            "conversation_trend": [],
            "knowledge_sources": [],
            "qa_satisfaction": {"positive": 0, "negative": 0, "rate": 0},
            "recent_queries": [],
        }

    # ── 数据提取 #1 ──

    bs = base_stats.one()
    stats = {
        "users": bs[0],
        "scenic_spots": bs[1],
        "knowledge_points": bs[2],
        "conversations": bs[3],
        "messages": bs[4],
        "behavior_records": 0,
    }

    bh = bh_stats_raw.one()
    stats["behavior_records"] = bh[0] or 0

    tourist_demographics = {
        "age_distribution": [
            {"range": "≤18岁", "count": bh[1] or 0},
            {"range": "19-25岁", "count": bh[2] or 0},
            {"range": "26-35岁", "count": bh[3] or 0},
            {"range": "36-45岁", "count": bh[4] or 0},
            {"range": "46-55岁", "count": bh[5] or 0},
            {"range": "≥56岁", "count": bh[6] or 0},
        ],
        "gender": {"male": bh[7] or 0, "female": bh[8] or 0},
    }

    satisfaction = {
        "distribution": [
            {"rating": 1, "count": bh[9] or 0},
            {"rating": 2, "count": bh[10] or 0},
            {"rating": 3, "count": bh[11] or 0},
            {"rating": 4, "count": bh[12] or 0},
            {"rating": 5, "count": bh[13] or 0},
        ],
        "average": round(float(bh[14]), 1) if bh[14] else 0,
    }

    spending = {
        "breakdown": [
            {"category": "门票", "avg": round(float(bh[15]), 0) if bh[15] else 0},
            {"category": "餐饮", "avg": round(float(bh[17]), 0) if bh[17] else 0},
            {"category": "购物", "avg": round(float(bh[19]), 0) if bh[19] else 0},
            {"category": "交通", "avg": round(float(bh[21]), 0) if bh[21] else 0},
            {"category": "娱乐", "avg": round(float(bh[23]), 0) if bh[23] else 0},
        ],
        "avg_total_cost": round(float(bh[24]), 0) if bh[24] else 0,
    }

    trend_rows = trend_raw.fetchall()
    trend_dict = {r[0]: r[1] for r in trend_rows}
    conversation_trend = []
    for i in range(29, -1, -1):
        d = (datetime.utcnow() - timedelta(days=i)).date()
        conversation_trend.append({"date": d.strftime("%m-%d"), "count": trend_dict.get(d, 0)})

    type_stats = [
        {"type": r[0], "count": r[1], "avg_satisfaction": round(float(r[2]), 1) if r[2] else 0}
        for r in spot_type_raw.fetchall()
    ]

    group_distribution = [{"size": r[0], "count": r[1]} for r in group_raw.fetchall()]

    knowledge_sources = [{"source": r[0], "count": r[1]} for r in ks_raw.fetchall()]

    # ── 并行 #2：热门景点 + 问答满意度 + 近期查询 ──
    try:
        hot_result, qa_pos, qa_neg, recent_msgs = await asyncio.gather(
            db.execute(
                select(
                    TouristBehavior.attraction_name,
                    TouristBehavior.attraction_type,
                    func.count(TouristBehavior.id).label('visit_count'),
                    func.avg(TouristBehavior.satisfaction).label('avg_satisfaction'),
                    func.avg(TouristBehavior.total_cost).label('avg_cost'),
                    func.avg(TouristBehavior.stay_duration).label('avg_stay'),
                )
                .where(lingshan_filter)
                .group_by(TouristBehavior.attraction_name)
                .order_by(func.count(TouristBehavior.id).desc())
                .limit(10)
            ),
            db.execute(select(func.count(Message.id)).where(Message.feedback == 1)),
            db.execute(select(func.count(Message.id)).where(Message.feedback == -1)),
            db.execute(
                select(Message.content)
                .where(Message.role == "user")
                .order_by(Message.created_at.desc())
                .limit(20)
            ),
        )
    except Exception:
        logger.exception("dashboard_full gather #2 failed")
        hot_attractions = []
        qa_satisfaction = {"positive": 0, "negative": 0, "rate": 0}
        recent_queries = []
    else:
        hot_attractions = [
            {
                "name": r[0], "type": r[1],
                "visit_count": r[2],
                "avg_satisfaction": round(float(r[3]), 1) if r[3] else 0,
                "avg_cost": round(float(r[4]), 0) if r[4] else 0,
                "avg_stay_min": round(float(r[5]), 1) if r[5] else 0,
            }
            for r in hot_result.fetchall()
        ]

        positive = qa_pos.scalar() or 0
        negative = qa_neg.scalar() or 0
        qa_satisfaction = {
            "positive": positive,
            "negative": negative,
            "rate": round(positive / (positive + negative) * 100, 1) if (positive + negative) > 0 else 0,
        }

        recent_queries = [r[0][:50] for r in recent_msgs.fetchall()]

    return {
        "stats": stats,
        "tourist_demographics": tourist_demographics,
        "satisfaction": satisfaction,
        "spending": spending,
        "hot_attractions": hot_attractions,
        "type_stats": type_stats,
        "group_distribution": group_distribution,
        "conversation_trend": conversation_trend,
        "knowledge_sources": knowledge_sources,
        "qa_satisfaction": qa_satisfaction,
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
