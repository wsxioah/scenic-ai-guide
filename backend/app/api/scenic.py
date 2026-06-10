import json, base64, httpx
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.database import get_db
from app.models.entities import ScenicSpot, TourRoute, Comment, Announcement
from app.core.config import settings

router = APIRouter()


class ScenicCreate(BaseModel):
    name: str
    category: str = "自然"
    lat: float
    lng: float
    address: str = ""
    description: str = ""
    images: str = "[]"
    price: float = 0
    open_time: str = ""
    level: str = ""


@router.get("/spots")
async def list_spots(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    category: str | None = None,
    keyword: str | None = None,
    sort: str = "default",
    db: AsyncSession = Depends(get_db),
):
    """景点列表"""
    query = select(ScenicSpot)
    if category:
        query = query.where(ScenicSpot.category == category)
    if keyword:
        query = query.where(ScenicSpot.name.contains(keyword) | ScenicSpot.description.contains(keyword))
    if sort == "hot":
        query = query.order_by(ScenicSpot.pv.desc())
    elif sort == "score":
        query = query.order_by(ScenicSpot.score.desc())
    else:
        query = query.order_by(ScenicSpot.id.desc())

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()

    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    spots = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [{
            "id": s.id, "name": s.name, "category": s.category,
            "lat": s.lat, "lng": s.lng, "address": s.address,
            "description": s.description[:200], "price": s.price,
            "open_time": s.open_time, "level": s.level,
            "pv": s.pv, "score": s.score
        } for s in spots]
    }


@router.get("/spots/{spot_id}")
async def get_spot_detail(spot_id: int, db: AsyncSession = Depends(get_db)):
    """景点详情"""
    result = await db.execute(select(ScenicSpot).where(ScenicSpot.id == spot_id))
    spot = result.scalar_one_or_none()
    if not spot:
        raise HTTPException(status_code=404, detail="景点不存在")
    # 增加PV
    spot.pv += 1
    await db.commit()
    return {
        "id": spot.id, "name": spot.name, "category": spot.category,
        "lat": spot.lat, "lng": spot.lng, "address": spot.address,
        "description": spot.description, "images": spot.images,
        "price": spot.price, "open_time": spot.open_time,
        "level": spot.level, "pv": spot.pv, "score": spot.score,
    }


@router.post("/spots")
async def create_spot(spot: ScenicCreate, db: AsyncSession = Depends(get_db)):
    s = ScenicSpot(**spot.model_dump())
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return {"id": s.id, "message": "创建成功"}


@router.get("/routes")
async def list_routes(db: AsyncSession = Depends(get_db)):
    """游览路线列表"""
    result = await db.execute(select(TourRoute).order_by(TourRoute.id.desc()))
    routes = result.scalars().all()
    return [{
        "id": r.id, "name": r.name, "spots": r.spots,
        "duration": r.duration, "difficulty": r.difficulty,
        "description": r.description[:200],
    } for r in routes]


@router.get("/comments/{spot_id}")
async def get_comments(spot_id: int, page: int = 1, db: AsyncSession = Depends(get_db)):
    """景点评论"""
    result = await db.execute(
        select(Comment)
        .where(Comment.scenic_id == spot_id, Comment.parent_id == None)
        .order_by(Comment.created_at.desc())
        .offset((page - 1) * 20).limit(20)
    )
    comments = result.scalars().all()
    return [{
        "id": c.id, "user_id": c.user_id, "content": c.content,
        "rating": c.rating, "likes": c.likes,
        "created_at": c.created_at.isoformat(),
    } for c in comments]


@router.post("/comments")
async def create_comment(
    user_id: int, scenic_id: int, content: str, rating: int = 5,
    db: AsyncSession = Depends(get_db),
):
    c = Comment(user_id=user_id, scenic_id=scenic_id, content=content, rating=rating)
    db.add(c)
    await db.commit()
    return {"id": c.id, "message": "评论成功"}


@router.get("/announcements")
async def get_announcements(db: AsyncSession = Depends(get_db)):
    """获取公告"""
    result = await db.execute(
        select(Announcement).where(Announcement.is_active == True)
        .order_by(Announcement.created_at.desc()).limit(10)
    )
    announcements = result.scalars().all()
    return [{
        "id": a.id, "title": a.title, "content": a.content,
        "type": a.type, "created_at": a.created_at.isoformat(),
    } for a in announcements]


@router.get("/nearby")
async def nearby_spots(lat: float, lng: float, radius: float = 5.0,
                       db: AsyncSession = Depends(get_db)):
    """查找附近景点（简单距离计算）"""
    result = await db.execute(select(ScenicSpot))
    spots = result.scalars().all()
    # 简易距离过滤
    nearby = []
    for s in spots:
        dist = ((s.lat - lat) ** 2 + (s.lng - lng) ** 2) ** 0.5 * 111
        if dist <= radius:
            nearby.append({
                "id": s.id, "name": s.name, "lat": s.lat, "lng": s.lng,
                "distance_km": round(dist, 2), "category": s.category,
            })
    nearby.sort(key=lambda x: x["distance_km"])
    return nearby


# 灵山胜境已知景点特征描述（用于视觉识别匹配）
KNOWN_SPOTS = [
    {"id": "LS-001", "name": "灵山大照壁", "features": "大型石雕照壁，正面鎏金大字'灵山胜境'，背面刻有诗文，面对太湖，景区入口"},
    {"id": "LS-002", "name": "五明桥", "features": "五座并列汉白玉石拱桥，横跨水面，桥身刻有佛教图案"},
    {"id": "LS-003", "name": "佛足坛", "features": "一对巨型青铜佛足印，足心刻有吉祥图案，位于中轴线上"},
    {"id": "LS-004", "name": "五智门", "features": "高16.8米六柱五门石牌坊，汉白玉雕刻，顶部有飞天神兽图案"},
    {"id": "LS-005", "name": "菩提大道", "features": "长约250米林荫步道，两侧种植菩提树形成拱廊"},
    {"id": "LS-006", "name": "九龙灌浴", "features": "大型青铜动态群雕，莲花瓣开合，九条飞龙喷水，中央鎏金太子佛，圆形水池"},
    {"id": "LS-007", "name": "降魔浮雕", "features": "长达26米花岗岩巨型浮雕，刻画佛陀降魔成道的场景"},
    {"id": "LS-008", "name": "阿育王柱", "features": "整块花岗岩石柱，高16.9米，柱头有四头狮子朝向四个方向"},
    {"id": "LS-009", "name": "百子戏弥勒", "features": "青铜群雕，袒胸露腹笑容满面的弥勒佛身上有百名孩童嬉戏"},
    {"id": "LS-010", "name": "祥符禅寺", "features": "仿唐风格古寺，红墙黛瓦，大雄宝殿，钟楼有巨大铜钟，千年银杏树"},
    {"id": "LS-011", "name": "灵山大佛", "features": "88米高露天青铜释迦牟尼立像，右手施无畏印左手与愿印，矗立山巅俯瞰太湖，世界最高青铜佛像"},
    {"id": "LS-012", "name": "佛教文化博览馆", "features": "灵山大佛座基内部三层展馆，展示佛教文化，万佛殿有近万尊小佛像"},
    {"id": "LS-013", "name": "灵山梵宫", "features": "大型佛教宫殿建筑，五座金色莲花塔，米黄色外墙，内部穹顶壁画《华藏世界》琉璃，东阳木雕，被誉为'东方卢浮宫'"},
    {"id": "LS-014", "name": "五印坛城", "features": "藏式风格建筑，白墙红边金顶，四面环水，转经筒长廊，被称为'小布达拉宫'"},
    {"id": "LS-015", "name": "曼飞龙塔", "features": "白色九塔组合，南传佛教风格，主塔高16.9米，八座小塔环绕，傣族建筑特色"},
    {"id": "LS-016", "name": "无尽意斋", "features": "中式四合院建筑，青砖灰瓦，赵朴初先生纪念馆，内有禅茶室"},
]


@router.post("/recognize")
async def recognize_scenic(image: str = Form(...), db: AsyncSession = Depends(get_db)):
    """
    拍照识景：用大模型视觉能力识别照片中的景点。
    先判断是否为景区相关内容，若是则匹配具体景点，若不是则用AI描述照片内容。
    """
    # 获取所有已知景点信息作为参考
    result = await db.execute(select(ScenicSpot))
    db_spots = result.scalars().all()
    spot_names = [s.name for s in db_spots]

    spots_desc = "\n".join([
        f"- {s['name']}: {s['features']}" for s in KNOWN_SPOTS
    ])

    system_prompt = f"""你是一个景区景点识别助手。你擅长通过照片判断是否为景区/旅游相关内容，并识别具体的景点。

以下是灵山胜境景区已知的景点列表及特征：

{spots_desc}

数据库中的景点名称：{', '.join(spot_names) if spot_names else '暂无数据'}

请分析用户上传的照片，并按以下JSON格式返回结果（只返回JSON，不要其他内容）：
{{
  "is_scenic": true/false,
  "spot_name": "景点名称（is_scenic为true时填写，从上述列表中匹配最接近的；若不匹配任何已知景点则填'未知景点'）",
  "confidence": 0.0-1.0,
  "category": "宗教/人文/自然/其他",
  "description": "对照片内容的详细描述（50字以内）",
  "ai_description": "AI对照片内容的识别描述，说明这是什么（如果is_scenic为false，请描述照片中实际看到的是什么，如'这是一只猫'、'这是一杯咖啡'等）"
}}

判断标准：
- 如果照片中有寺庙、佛像、佛塔、石刻、古建筑、园林景观、山湖自然风光、景区标志物等旅游相关元素 → is_scenic: true
- 如果照片是人物自拍、食物、宠物、室内家居、电子产品、日常物品等非景区内容 → is_scenic: false"""

    try:
        api_key = settings.llm_api_key
        if not api_key:
            # 无API Key时返回兜底结果
            return {
                "is_scenic": True,
                "spot_name": "灵山大佛",
                "confidence": 0.6,
                "category": "宗教",
                "description": "无法连接AI服务，请检查API配置。默认显示灵山大佛。",
                "ai_description": "",
            }

        async with httpx.AsyncClient(timeout=30) as client:
            # 构建多模态消息
            content = [
                {"type": "text", "text": "请分析这张照片，判断是否为景区相关照片，并识别内容。"},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image}"}},
            ]

            response = await client.post(
                f"{settings.llm_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.llm_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": content},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500,
                },
            )

            data = response.json()
            text = data["choices"][0]["message"]["content"].strip()

            # 解析JSON响应
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            result_data = json.loads(text)

            # 如果是景区且匹配到景点，尝试从数据库获取坐标
            spot_name = result_data.get("spot_name", "")
            lat, lng = None, None
            if result_data.get("is_scenic") and spot_name and spot_name != "未知景点":
                spot_result = await db.execute(
                    select(ScenicSpot).where(ScenicSpot.name == spot_name)
                )
                db_spot = spot_result.scalar_one_or_none()
                if db_spot:
                    lat, lng = db_spot.lat, db_spot.lng
                else:
                    # 从KNOW_SPOTS查找坐标
                    for ks in KNOWN_SPOTS:
                        if ks["name"] == spot_name:
                            lat, lng = 31.423, 120.090  # fallback
                            break

            return {
                "is_scenic": result_data.get("is_scenic", True),
                "spot_name": spot_name,
                "confidence": float(result_data.get("confidence", 0.5)),
                "category": result_data.get("category", ""),
                "description": result_data.get("description", ""),
                "ai_description": result_data.get("ai_description", ""),
                "lat": lat,
                "lng": lng,
            }

    except (json.JSONDecodeError, KeyError) as e:
        # JSON解析失败时返回兜底
        return {
            "is_scenic": True,
            "spot_name": "灵山胜境",
            "confidence": 0.4,
            "category": "人文",
            "description": f"AI识别结果解析失败，请重试",
            "ai_description": text[:200] if 'text' in dir() else "",
            "lat": 31.423,
            "lng": 120.090,
        }
    except Exception as e:
        return {
            "is_scenic": True,
            "spot_name": "灵山大佛",
            "confidence": 0.5,
            "category": "宗教",
            "description": f"识别服务暂时不可用: {str(e)[:50]}",
            "ai_description": "",
            "lat": 31.423,
            "lng": 120.090,
        }
