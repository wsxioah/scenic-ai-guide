import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.database import get_db
from app.models.entities import PoiLocation

def _poi_to_dict(p) -> dict:
    return {
        "id": p.id, "name": p.name, "category": p.category,
        "description": p.description, "address": p.address,
        "lat": p.lat, "lng": p.lng, "phone": p.phone,
        "opening_hours": p.opening_hours, "icon": p.icon,
        "is_published": p.is_published, "sort_order": p.sort_order,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


router = APIRouter()


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """计算两点间距离 (km)"""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@router.get("/nearby")
async def get_nearby_pois(
    lat: float = Query(..., description="纬度"),
    lng: float = Query(..., description="经度"),
    radius_km: float = Query(5.0, description="搜索半径(km)"),
    category: str | None = Query(None, description="分类筛选: toilet/food/parking/shop/entrance/service"),
    limit: int = Query(20, le=50),
    db: AsyncSession = Depends(get_db),
):
    """搜索附近POI，按距离排序"""
    stmt = select(PoiLocation).where(PoiLocation.is_published == True)
    if category:
        stmt = stmt.where(PoiLocation.category == category)

    result = await db.execute(stmt)
    pois = result.scalars().all()

    nearby = []
    for p in pois:
        d = haversine_km(lat, lng, p.lat, p.lng)
        if d <= radius_km:
            nearby.append({
                "id": p.id,
                "name": p.name,
                "category": p.category,
                "description": p.description,
                "address": p.address,
                "lat": p.lat,
                "lng": p.lng,
                "phone": p.phone,
                "opening_hours": p.opening_hours,
                "icon": p.icon,
                "distance_km": round(d, 3),
            })

    nearby.sort(key=lambda x: x["distance_km"])
    return {"pois": nearby[:limit], "center": {"lat": lat, "lng": lng}}


@router.get("/categories")
async def get_poi_categories(db: AsyncSession = Depends(get_db)):
    """获取POI分类选项及数量"""
    CATEGORY_OPTIONS = [
        {"key": "toilet", "label": "厕所", "icon": "🚻"},
        {"key": "food", "label": "餐饮", "icon": "🍜"},
        {"key": "parking", "label": "停车", "icon": "🅿️"},
        {"key": "shop", "label": "便利店", "icon": "🏪"},
        {"key": "scenic", "label": "景点", "icon": "🏛️"},
        {"key": "station", "label": "交通", "icon": "🚌"},
        {"key": "service", "label": "服务中心", "icon": "ℹ️"},
        {"key": "entrance", "label": "出入口", "icon": "🚪"},
        {"key": "other", "label": "其他", "icon": "📍"},
    ]
    stmt = select(PoiLocation).where(PoiLocation.is_published == True)
    result = await db.execute(stmt)
    pois = result.scalars().all()
    counts: dict[str, int] = {}
    for p in pois:
        counts[p.category] = counts.get(p.category, 0) + 1
    return {
        "categories": CATEGORY_OPTIONS,
        "counts": counts,
    }


# ==================== 管理 CRUD ====================

@router.get("")
async def list_pois(
    search: str | None = Query(None),
    category: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PoiLocation).where(PoiLocation.is_published == True)
    if search:
        stmt = stmt.where(PoiLocation.name.contains(search))
    if category:
        stmt = stmt.where(PoiLocation.category == category)
    # Count total matching records before pagination
    count_stmt = select(PoiLocation).where(PoiLocation.is_published == True)
    if search:
        count_stmt = count_stmt.where(PoiLocation.name.contains(search))
    if category:
        count_stmt = count_stmt.where(PoiLocation.category == category)
    count_result = await db.execute(count_stmt)
    total = len(count_result.scalars().all())

    stmt = stmt.order_by(PoiLocation.sort_order.asc(), PoiLocation.id.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    pois = result.scalars().all()
    return {"items": [_poi_to_dict(p) for p in pois], "total": total}


@router.get("/{poi_id}")
async def get_poi(poi_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PoiLocation).where(PoiLocation.id == poi_id))
    poi = result.scalars().first()
    if not poi:
        from fastapi import HTTPException
        raise HTTPException(404, "POI不存在")
    return _poi_to_dict(poi)


@router.post("")
async def create_poi(
    name: str = Query(..., min_length=1),
    category: str = Query("other"),
    lat: float = Query(...),
    lng: float = Query(...),
    description: str | None = Query(None),
    address: str | None = Query(None),
    phone: str | None = Query(None),
    opening_hours: str | None = Query(None),
    icon: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    poi = PoiLocation(
        name=name.strip(), category=category, lat=lat, lng=lng,
        description=description, address=address, phone=phone,
        opening_hours=opening_hours, icon=icon, is_published=True,
    )
    db.add(poi)
    await db.commit()
    await db.refresh(poi)
    return {"id": poi.id, "name": poi.name, "category": poi.category}


@router.put("/{poi_id}")
async def update_poi(
    poi_id: int,
    name: str | None = Query(None),
    category: str | None = Query(None),
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    description: str | None = Query(None),
    address: str | None = Query(None),
    phone: str | None = Query(None),
    opening_hours: str | None = Query(None),
    icon: str | None = Query(None),
    is_published: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PoiLocation).where(PoiLocation.id == poi_id))
    poi = result.scalars().first()
    if not poi:
        from fastapi import HTTPException
        raise HTTPException(404, "POI不存在")
    if name is not None: poi.name = name.strip()
    if category is not None: poi.category = category
    if lat is not None: poi.lat = lat
    if lng is not None: poi.lng = lng
    if description is not None: poi.description = description
    if address is not None: poi.address = address
    if phone is not None: poi.phone = phone
    if opening_hours is not None: poi.opening_hours = opening_hours
    if icon is not None: poi.icon = icon
    if is_published is not None: poi.is_published = is_published
    await db.commit()
    await db.refresh(poi)
    return {"message": "已更新", "id": poi.id}


@router.delete("/{poi_id}")
async def delete_poi(poi_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PoiLocation).where(PoiLocation.id == poi_id))
    poi = result.scalars().first()
    if not poi:
        from fastapi import HTTPException
        raise HTTPException(404, "POI不存在")
    poi.is_published = False
    await db.commit()
    return {"message": "已下架"}
