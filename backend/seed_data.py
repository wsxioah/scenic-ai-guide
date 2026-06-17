# -*- coding: utf-8 -*-
import asyncio
import sys
sys.stdout.reconfigure(encoding='utf-8')

from app.models.database import engine, Base, async_session
from app.models.entities import ScenicSpot, KnowledgePoint, TourRoute, DigitalHumanConfig
from app.services.rag_service import RAGService
from sqlalchemy import select


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    rag = RAGService()

    # Clean existing data for re-seeding
    async with async_session() as db:
        from app.models.entities import Comment, Message, Conversation, KnowledgePoint, TourRoute, DigitalHumanConfig, ScenicSpot
        for model in [Comment, Message, Conversation, KnowledgePoint, TourRoute, DigitalHumanConfig, ScenicSpot]:
            from sqlalchemy import delete
            await db.execute(delete(model))
        await db.commit()

    spots_data = [
        ("灵山大佛", "宗教", 31.4230, 120.0980, "无锡市滨湖区马山灵山路1号", "5A",
         "灵山大佛高88米，是中国最高的青铜立佛。佛像面向太湖，背靠灵山。游客可乘电梯登临佛脚平台，俯瞰灵山胜境全景。大佛于1997年落成开光。",
         210, "07:00-17:30"),
        ("九龙灌浴", "人文", 31.4228, 120.0972, "无锡市滨湖区马山灵山路灵山胜境内", "5A",
         "九龙灌浴是灵山胜境的大型动态音乐群雕，再现释迦牟尼诞生时九龙吐水沐浴的场景。每天定时演出，莲花开合高达18米。",
         0, "演出时间: 10:00, 11:30, 14:00, 16:00"),
        ("梵宫", "人文", 31.4225, 120.0985, "无锡市滨湖区马山灵山路灵山胜境梵宫", "5A",
         "灵山梵宫是世界级佛教文化艺术殿堂，建筑融合了中国石窟艺术和传统佛教建筑风格。宫内拥有世界最大的梵宫穹顶壁画。",
         0, "08:30-17:00"),
        ("五印坛城", "宗教", 31.4235, 120.0975, "无锡市滨湖区马山灵山路", "5A",
         "五印坛城仿西藏布达拉宫风格建造，展示藏传佛教文化。坛城内部供奉五方佛，四壁绘制精美坛城壁画。",
         0, "08:30-17:00"),
        ("曼飞龙塔", "宗教", 31.4223, 120.0990, "无锡市滨湖区马山灵山路", "5A",
         "曼飞龙塔仿云南西双版纳曼飞龙白塔建造，塔身洁白如玉。塔群由一座主塔和八座小塔组成，象征佛教的须弥山。",
         0, "08:30-17:00"),
        ("天下第一掌", "人文", 31.4232, 120.0978, "无锡市滨湖区马山灵山路", "5A",
         "天下第一掌是灵山大佛的右手复制品，高11.7米，宽5.5米。手掌上刻有法轮等佛教图案，寓意摸佛手添福寿。",
         0, "全天"),
        ("百子戏弥勒", "人文", 31.4227, 120.0982, "无锡市滨湖区马山灵山路", "5A",
         "百子戏弥勒是一座大型青铜雕塑，展现弥勒佛与一百个童子嬉戏的欢乐场景。雕塑寓意欢喜人间笑口常开。",
         0, "全天"),
        ("灵山精舍", "人文", 31.4240, 120.0995, "无锡市滨湖区马山灵山路", "5A",
         "灵山精舍提供禅修体验、素斋品鉴、茶道体验等服务。游客可在此静心抄经、品茶冥想。精舍素斋以三德六味著称。",
         68, "09:00-18:00"),
    ]

    async with async_session() as db:
        for (name, cat, lat, lng, addr, level, desc, price, open_time) in spots_data:
            spot = ScenicSpot(name=name, category=cat, lat=lat, lng=lng,
                              address=addr, level=level, description=desc,
                              price=price, open_time=open_time)
            db.add(spot)
        await db.commit()

    knowledge_data = [
        ("灵山大佛建造历史", "灵山大佛",
         "灵山大佛于1994年开始筹建，1997年11月15日落成开光。大佛由著名雕塑家吴显林设计，青铜铸造，总高88米，其中佛身79米，莲花座9米。大佛共用青铜约500吨，是世界上最高的大型露天青铜释迦牟尼立佛。大佛的建造得到了中国佛教协会前会长赵朴初先生的大力支持。开光当日，海内外高僧大德云集，盛况空前。"),
        ("灵山胜境简介", "灵山胜境",
         "灵山胜境位于江苏省无锡市太湖之滨，是国家5A级旅游景区。景区占地面积约30公顷，主要由灵山大佛、九龙灌浴、梵宫、五印坛城、曼飞龙塔等景点组成。灵山胜境以佛教文化为主题，集自然山水、佛教建筑、艺术展示于一体，是中国著名的佛教文化旅游胜地。每年接待游客超过300万人次。景区全年开放，建议游览时间4-6小时。"),
        ("九龙灌浴演出时间", "九龙灌浴",
         "九龙灌浴是灵山胜境最受欢迎的大型动态演出之一。演出时间：每天上午10:00、11:30，下午14:00、16:00，每场演出约15分钟。演出期间，莲花花瓣缓缓打开，高达18米，九龙同时喷水高达30米，配合音乐和喷泉，场面壮观。演出结束后游客可排队接取八功德水。遇恶劣天气可能暂停演出，请关注当日公告。"),
        ("梵宫参观指南", "梵宫",
         "灵山梵宫被誉为东方卢浮宫，是灵山胜境的核心建筑之一。梵宫外观融合了印度、尼泊尔和中国传统建筑风格。宫内分为东展厅、西展厅、中央大厅和梵宫剧场。中央大厅拥有世界最大的琉璃壁画和穹顶彩绘。梵宫剧场每天上演大型音乐史诗灵山吉祥颂。参观梵宫建议预留1-2小时。"),
        ("游览路线推荐", "灵山胜境",
         "推荐游览路线：经典线（约4小时）：景区入口、灵山大佛、九龙灌浴、梵宫、五印坛城、出口。深度线（约6小时）：涵盖所有主要景点，增加灵山精舍体验。轻松线（约3小时）：景区入口、电瓶车、灵山大佛、九龙灌浴、梵宫、电瓶车、出口。建议上午8:30入园，可看到所有演出场次。景区内提供电瓶车服务，20元每人。"),
        ("门票与优惠", "灵山胜境",
         "灵山胜境门票：成人票210元每人。半价票105元每人，适用于6-18岁未成年人、60-69岁老人、全日制学生。免票对象：6岁以下或身高1.2米以下儿童、70岁以上老人、残疾人、现役军人、离休干部。门票当日有效，一次入园。网上预订可享受95折优惠。团队票20人以上168元每人，需提前一天预约。"),
        ("交通指南", "灵山胜境",
         "交通指南：公交：无锡火车站乘坐88路直达灵山胜境，约50分钟。地铁：地铁1号线至市民中心站换乘88路。自驾：沪宁高速无锡东出口下，沿太湖大道直行约20公里即达，景区有大型停车场。高铁：无锡东站乘坐地铁2号线换88路，或打车约70元。飞机：苏南硕放机场打车约100元直达。"),
        ("素斋与餐饮", "灵山精舍",
         "灵山胜境餐饮选择：灵山精舍素斋：提供精致素斋套餐，68元每人起。梵宫素斋厅：自助素斋58元每人。景区小吃街：提供素包、素面、素饼等简餐，15-30元每人。景区外餐饮：景区出口附近有多家农家乐，提供太湖三白等无锡特色菜。建议游客携带适量饮用水，夏季注意防晒。"),
    ]

    for (title, scenic_name, content) in knowledge_data:
        async with async_session() as db:
            result = await db.execute(select(ScenicSpot).where(ScenicSpot.name == scenic_name))
            spot = result.scalar_one_or_none()
            embedding_id = await rag.add_knowledge(
                title=title, content=content,
                tags=["灵山胜境", "A5赛题"],
                scenic_id=spot.id if spot else None,
            )
            # Also create KnowledgePoint in DB for admin management
            kp = KnowledgePoint(
                scenic_id=spot.id if spot else None,
                title=title, content=content,
                tags="灵山胜境,A5赛题",
                source="seed",
                embedding_id=embedding_id,
            )
            db.add(kp)
            await db.commit()

    routes_data = [
        ("经典礼佛线", "[1,2,3,4]", 240, "easy", "灵山大佛、九龙灌浴、梵宫、五印坛城，适合首次游客"),
        ("深度探索线", "[1,2,3,4,5,6,7,8]", 360, "medium", "涵盖所有主要景点，增加灵山精舍体验"),
        ("休闲摄影线", "[1,3,5,6]", 180, "easy", "经典拍照打卡点，适合摄影爱好者"),
    ]

    async with async_session() as db:
        for (name, spots, dur, diff, desc) in routes_data:
            route = TourRoute(name=name, spots=spots, duration=dur, difficulty=diff, description=desc)
            db.add(route)

        config = DigitalHumanConfig(
            model_type="vrm",
            voice_type="zh-CN-XiaoxiaoNeural",
            greeting_message="您好！我是灵山胜境AI导览助手。我可以为您介绍景点、推荐路线、解答关于佛教文化的问题。请问有什么可以帮您的？",
        )
        db.add(config)
        await db.commit()

    print(f"Seed complete: {len(spots_data)} spots, {len(knowledge_data)} knowledge items, {len(routes_data)} routes")
    print("Database seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
