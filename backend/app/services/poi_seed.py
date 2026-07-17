"""灵山景区POI种子数据"""
import asyncio
from app.models.database import async_session
from app.models.entities import PoiLocation
from sqlalchemy import select


SEED_POIS = [
    # 出入口
    {"name": "南门（主入口）", "category": "entrance", "lat": 31.4180, "lng": 120.0890, "icon": "🚪", "address": "灵山胜境南门"},
    {"name": "东门", "category": "entrance", "lat": 31.4214, "lng": 120.0925, "icon": "🚪", "address": "灵山胜境东门"},
    # 卫生间
    {"name": "南门卫生间", "category": "toilet", "lat": 31.4185, "lng": 120.0890, "icon": "🚻"},
    {"name": "九龙灌浴卫生间", "category": "toilet", "lat": 31.4206, "lng": 120.0898, "icon": "🚻"},
    {"name": "梵宫卫生间", "category": "toilet", "lat": 31.4221, "lng": 120.0878, "icon": "🚻"},
    {"name": "大佛脚下卫生间", "category": "toilet", "lat": 31.4233, "lng": 120.0895, "icon": "🚻"},
    {"name": "祥符禅寺卫生间", "category": "toilet", "lat": 31.4218, "lng": 120.0900, "icon": "🚻"},
    # 停车场
    {"name": "停车场 P1", "category": "parking", "lat": 31.429737, "lng": 120.103105, "icon": "🅿️"},
    {"name": "停车场 P2", "category": "parking", "lat": 31.429423, "lng": 120.103024, "icon": "🅿️"},
    {"name": "停车场 P3", "category": "parking", "lat": 31.426428, "lng": 120.110571, "icon": "🅿️"},
    {"name": "停车场 P4", "category": "parking", "lat": 31.428069, "lng": 120.110951, "icon": "🅿️"},
    {"name": "停车场 P5", "category": "parking", "lat": 31.428064, "lng": 120.112118, "icon": "🅿️"},
    {"name": "停车场 P6", "category": "parking", "lat": 31.429769, "lng": 120.111480, "icon": "🅿️"},
    # 服务中心
    {"name": "游客服务中心", "category": "service", "lat": 31.4182, "lng": 120.0891, "icon": "ℹ️", "phone": "0510-85680000", "opening_hours": "8:00-17:00"},
    # 餐饮
    {"name": "梵宫素斋", "category": "food", "lat": 31.4220, "lng": 120.0880, "icon": "🍜", "opening_hours": "11:00-14:00, 17:00-20:00"},
    {"name": "素面馆", "category": "food", "lat": 31.4208, "lng": 120.0900, "icon": "🍜", "opening_hours": "10:00-16:00"},
    {"name": "灵山精舍（素斋/住宿）", "category": "food", "lat": 31.4205, "lng": 120.0870, "icon": "🍜"},
    # 商店
    {"name": "法物流通处（梵宫店）", "category": "shop", "lat": 31.4222, "lng": 120.0877, "icon": "🏪", "opening_hours": "9:00-17:00"},
    {"name": "纪念品商店（南门）", "category": "shop", "lat": 31.4181, "lng": 120.0893, "icon": "🏪", "opening_hours": "8:00-17:30"},
    # 交通
    {"name": "景区观光车·南门站", "category": "station", "lat": 31.4183, "lng": 120.0892, "icon": "🚌"},
    {"name": "景区观光车·佛脚下站", "category": "station", "lat": 31.4229, "lng": 120.0898, "icon": "🚌"},
    # 其他
    {"name": "AED急救站（游客中心）", "category": "other", "lat": 31.4183, "lng": 120.0889, "icon": "🏥"},
    {"name": "母婴室（游客中心）", "category": "other", "lat": 31.4182, "lng": 120.0890, "icon": "👶", "opening_hours": "8:00-17:00"},
]


async def seed_pois():
    """播种POI数据（跳过已存在的）"""
    async with async_session() as session:
        result = await session.execute(select(PoiLocation).limit(1))
        existing = result.scalars().first()
        if existing:
            print(f"[POI Seed] 已有 {await _count_pois(session)} 条POI数据，跳过播种")
            return

        for item in SEED_POIS:
            poi = PoiLocation(
                name=item["name"],
                category=item["category"],
                lat=item["lat"],
                lng=item["lng"],
                icon=item.get("icon"),
                address=item.get("address"),
                phone=item.get("phone"),
                opening_hours=item.get("opening_hours"),
                is_published=True,
            )
            session.add(poi)

        await session.commit()
        print(f"[POI Seed] 已播种 {len(SEED_POIS)} 条POI数据")


async def _count_pois(session):
    result = await session.execute(select(PoiLocation))
    return len(result.scalars().all())
