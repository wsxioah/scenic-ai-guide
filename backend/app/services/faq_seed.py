# -*- coding: utf-8 -*-
"""Seed FAQ data for 灵山 scenic area"""
from app.models.database import async_session
from app.models.entities import FAQ
from sqlalchemy import select

FAQ_SEED_DATA = [
    {"question": "灵山胜境景区的开放时间是什么？", "answer": "灵山胜境景区全年开放，夏季（4月-10月）开放时间为7:00-17:30，冬季（11月-3月）开放时间为7:30-17:00。建议合理安排游览时间，全程游览约需4-6小时。", "category": "general", "sort_order": 1},
    {"question": "灵山胜境的门票价格是多少？", "answer": "灵山胜境成人票210元/人。优惠票105元/人，适用于60-69周岁老人、全日制大中小学生（凭学生证）。70周岁以上老人、1.4米以下儿童、残疾人（凭残疾证）享受免票。具体价格以景区当天公告为准。", "category": "tickets", "sort_order": 2},
    {"question": "如何到达灵山胜境景区？", "answer": "灵山胜境位于无锡市滨湖区马山街道灵山路1号。自驾游客可导航至灵山胜境停车场；公交可乘坐88路、89路至灵山胜境站下车；也可在无锡火车站乘坐旅游专线直达。景区设有大型停车场，停车费10元/次。", "category": "transport", "sort_order": 3},
    {"question": "灵山胜境有哪些必看的景点？", "answer": "灵山胜境核心景点包括：88米高的灵山大佛（世界最高青铜佛像）、九龙灌浴（大型动态青铜群雕）、灵山梵宫（被誉为'东方卢浮宫'）、五印坛城（藏式风格建筑，有'小布达拉宫'之称）、祥符禅寺（千年古刹）、阿育王柱等。建议按中轴线由南向北游览。", "category": "general", "sort_order": 4},
    {"question": "景区内有餐饮设施吗？", "answer": "景区内设有素斋馆、小吃街和自助餐厅。灵山蔬食馆提供精致的佛教素食，人均消费约50-80元。此外还有便利店和自动售货机分布在各主要景点附近。建议也可自带适量食物和水。", "category": "facilities", "sort_order": 5},
    {"question": "游览灵山胜境有什么注意事项？", "answer": "灵山胜境是佛教文化景区，请注意：1）进入寺庙请保持安静，勿大声喧哗；2）拍照时请勿使用闪光灯；3）穿着得体，避免过于暴露的服装；4）景区面积较大，建议穿舒适的平底鞋；5）夏季注意防晒，冬季注意保暖；6）请勿触摸或攀爬佛像等文物。", "category": "general", "sort_order": 6},
]


async def seed_faqs():
    async with async_session() as db:
        result = await db.execute(select(FAQ).limit(1))
        if result.scalar_one_or_none():
            return
        for item in FAQ_SEED_DATA:
            db.add(FAQ(**item))
        await db.commit()
