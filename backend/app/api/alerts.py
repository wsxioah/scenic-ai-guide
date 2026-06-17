import math
import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.database import get_db
from app.models.entities import LostAlert

router = APIRouter()
public_router = APIRouter()


def _alert_to_dict(a: LostAlert) -> dict:
    return {
        "id": a.id,
        "type": a.type,
        "status": a.status,
        "name": a.name,
        "description": a.description,
        "contact_phone": a.contact_phone,
        "lat": a.lat,
        "lng": a.lng,
        "scenic_id": a.scenic_id,
        "broadcast_count": a.broadcast_count,
        "broadcast_completed": a.broadcast_completed,
        "reviewed_at": a.reviewed_at.isoformat() if a.reviewed_at else None,
        "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
        "extra_metadata": a.extra_metadata,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


# ==================== 公开 API ====================

@public_router.post("")
async def submit_alert(
    type: str = Query(..., description="lost_child 或 lost_item"),
    name: str = Query(..., min_length=1, max_length=100),
    description: str | None = Query(None),
    contact_phone: str | None = Query(None),
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    scenic_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """游客提交走丢/失物报警"""
    if type not in ("lost_child", "lost_item"):
        raise HTTPException(400, "type 必须为 lost_child 或 lost_item")

    alert = LostAlert(
        type=type,
        status="pending",
        name=name.strip(),
        description=description,
        contact_phone=contact_phone,
        lat=lat,
        lng=lng,
        scenic_id=scenic_id,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return {"message": "报警已提交，等待审核", "alert": _alert_to_dict(alert)}


@public_router.get("/active")
async def get_active_lost_children(
    scenic_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """获取活跃的走丢儿童标记（用于地图展示）"""
    stmt = select(LostAlert).where(
        LostAlert.status == "approved",
        LostAlert.type == "lost_child",
        LostAlert.lat.isnot(None),
        LostAlert.lng.isnot(None),
    )
    if scenic_id:
        stmt = stmt.where(LostAlert.scenic_id == scenic_id)
    stmt = stmt.order_by(LostAlert.created_at.desc()).limit(20)
    result = await db.execute(stmt)
    alerts = result.scalars().all()
    return {"alerts": [_alert_to_dict(a) for a in alerts]}


@public_router.get("/broadcast")
async def get_broadcast_alerts(
    scenic_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """获取需要滚动播报的报警（已审批、未完成播报）"""
    stmt = select(LostAlert).where(
        LostAlert.status == "approved",
        LostAlert.broadcast_completed == False,
    )
    if scenic_id:
        stmt = stmt.where(LostAlert.scenic_id == scenic_id)
    stmt = stmt.order_by(LostAlert.created_at.desc()).limit(10)
    result = await db.execute(stmt)
    alerts = result.scalars().all()
    return {"alerts": [_alert_to_dict(a) for a in alerts]}


@public_router.get("/lost-items")
async def search_lost_items(
    keyword: str | None = Query(None),
    scenic_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """搜索失物招领"""
    stmt = select(LostAlert).where(
        LostAlert.status == "approved",
        LostAlert.type == "lost_item",
    )
    if keyword:
        stmt = stmt.where(LostAlert.name.contains(keyword))
    if scenic_id:
        stmt = stmt.where(LostAlert.scenic_id == scenic_id)
    stmt = stmt.order_by(LostAlert.created_at.desc()).limit(20)
    result = await db.execute(stmt)
    alerts = result.scalars().all()
    return {"items": [_alert_to_dict(a) for a in alerts]}


# ==================== 管理 API ====================

@router.get("")
async def list_alerts(
    type: str | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """管理员查看报警列表"""
    stmt = select(LostAlert)
    if type:
        stmt = stmt.where(LostAlert.type == type)
    if status:
        stmt = stmt.where(LostAlert.status == status)
    if search:
        stmt = stmt.where(LostAlert.name.contains(search))
    stmt = stmt.order_by(LostAlert.created_at.desc())

    # Count total matching records (before limit/offset)
    count_stmt = select(LostAlert)
    if type:
        count_stmt = count_stmt.where(LostAlert.type == type)
    if status:
        count_stmt = count_stmt.where(LostAlert.status == status)
    if search:
        count_stmt = count_stmt.where(LostAlert.name.contains(search))
    count_result = await db.execute(count_stmt)
    total = len(count_result.scalars().all())

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    alerts = result.scalars().all()
    return {"items": [_alert_to_dict(a) for a in alerts], "total": total}


@router.get("/{alert_id}")
async def get_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LostAlert).where(LostAlert.id == alert_id))
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(404, "报警不存在")
    return _alert_to_dict(alert)


@router.put("/{alert_id}")
async def update_alert(
    alert_id: int,
    status: str | None = Query(None, description="pending/approved/rejected/resolved"),
    broadcast_count: int | None = Query(None),
    broadcast_completed: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """管理员审核/更新报警状态"""
    result = await db.execute(select(LostAlert).where(LostAlert.id == alert_id))
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(404, "报警不存在")

    now = datetime.datetime.utcnow()
    if status:
        valid_statuses = ("pending", "approved", "rejected", "resolved")
        if status not in valid_statuses:
            raise HTTPException(400, f"status 必须为: {', '.join(valid_statuses)}")
        alert.status = status
        if status in ("approved", "rejected"):
            alert.reviewed_at = now
        if status == "resolved":
            alert.resolved_at = now
    if broadcast_count is not None:
        alert.broadcast_count = broadcast_count
    if broadcast_completed is not None:
        alert.broadcast_completed = broadcast_completed

    await db.commit()
    await db.refresh(alert)
    return _alert_to_dict(alert)


@router.delete("/{alert_id}")
async def delete_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LostAlert).where(LostAlert.id == alert_id))
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(404, "报警不存在")
    await db.delete(alert)
    await db.commit()
    return {"message": "已删除"}
