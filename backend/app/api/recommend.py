import json
import datetime
from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.database import get_db
from app.models.entities import User, UserFavorite, ScenicSpot
from app.core.auth import get_current_user
from app.services.recommend_service import RecommendService

router = APIRouter()
recommend_service = RecommendService()


async def _attach_spot_ids(db: AsyncSession, items: list[dict]) -> list[dict]:
    """Resolve scenic spot names to IDs from ScenicSpot table."""
    if not items:
        return items
    names = [item["name"] for item in items if item.get("name")]
    if not names:
        return items
    result = await db.execute(
        select(ScenicSpot.id, ScenicSpot.name).where(ScenicSpot.name.in_(names))
    )
    name_to_id = {row[1]: row[0] for row in result.fetchall()}
    for item in items:
        item["id"] = name_to_id.get(item["name"])
    return items


# ============ Public endpoints (no auth) ============

@router.get("/popular")
async def popular_attractions(
    type: str | None = Query(None, alias="type"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """热门景点排行（基于140K行为数据）"""
    items = await recommend_service.get_popular_attractions(attraction_type=type, limit=limit)
    return await _attach_spot_ids(db, items)


@router.get("/for-me")
async def recommend_for_me(
    age: int | None = Query(None),
    gender: str | None = Query(None),
    budget: float | None = Query(None),
    group_size: int | None = Query(None),
    preferred_type: str | None = Query(None),
    limit: int = Query(5, ge=1, le=20),
):
    """基于用户画像的个性化推荐"""
    return await recommend_service.recommend_for_profile(
        age=age, gender=gender, budget=budget,
        group_size=group_size, preferred_type=preferred_type, limit=limit,
    )


@router.get("/stats")
async def type_stats():
    """各类型景点行为统计"""
    return await recommend_service.get_type_stats()


@router.get("/similar")
async def similar_attractions(
    attraction: str = Query(..., description="景点名称"),
    limit: int = Query(3, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
):
    """相似游客还喜欢哪些景点"""
    items = await recommend_service.get_similar_visitors(attraction, limit=limit)
    return await _attach_spot_ids(db, items)


# ============ Authenticated endpoints (JWT required) ============

@router.get("/for-user")
async def recommend_for_user(
    limit: int = Query(5, ge=1, le=20),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """个性化景点推荐 — 基于对话历史、浏览记录和收藏"""
    items = await recommend_service.recommend_for_user(user, limit=limit)
    return await _attach_spot_ids(db, items)


@router.post("/track/view")
async def track_view(
    spot_id: int = Query(...),
    spot_name: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """记录景点浏览"""
    history = []
    if user.visit_history:
        try:
            history = json.loads(user.visit_history)
        except (json.JSONDecodeError, TypeError):
            history = []

    history = [h for h in history if h.get("spot_name") != spot_name]
    history.append({
        "spot_name": spot_name,
        "spot_id": spot_id,
        "viewed_at": datetime.datetime.utcnow().isoformat(),
    })
    history = history[-50:]
    user.visit_history = json.dumps(history, ensure_ascii=False)
    await db.commit()
    return {"message": "view recorded", "count": len(history)}


@router.post("/track/favorite")
async def toggle_favorite(
    scenic_spot_id: int = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """切换收藏状态"""
    result = await db.execute(
        select(UserFavorite).where(
            UserFavorite.user_id == user.id,
            UserFavorite.scenic_spot_id == scenic_spot_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()
        return {"favorited": False, "message": "已取消收藏"}
    else:
        fav = UserFavorite(user_id=user.id, scenic_spot_id=scenic_spot_id)
        db.add(fav)
        await db.commit()
        return {"favorited": True, "message": "已收藏"}


@router.get("/track/favorites")
async def list_favorites(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """我的收藏列表"""
    result = await db.execute(
        select(UserFavorite, ScenicSpot)
        .join(ScenicSpot, UserFavorite.scenic_spot_id == ScenicSpot.id)
        .where(UserFavorite.user_id == user.id)
        .order_by(UserFavorite.created_at.desc())
    )
    rows = result.all()
    return [{
        "favorite_id": fav.id,
        "spot_id": spot.id,
        "name": spot.name,
        "category": spot.category,
        "description": spot.description[:100] if spot.description else "",
        "price": spot.price,
        "pv": spot.pv,
        "created_at": fav.created_at.isoformat(),
    } for fav, spot in rows]
