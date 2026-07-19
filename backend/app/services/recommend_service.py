# -*- coding: utf-8 -*-
"""Tourist behavior-based recommendation service"""
import json
import logging
from sqlalchemy import select, func, and_
from app.models.database import async_session
from app.models.entities import TouristBehavior, User, ScenicSpot, Message, Conversation

logger = logging.getLogger(__name__)


class RecommendService:
    """Recommendation engine powered by 140K tourist behavior data"""

    async def get_popular_attractions(self, attraction_type: str = None, limit: int = 10) -> list[dict]:
        """Get most popular attractions by visit count and satisfaction (灵山 only)"""
        try:
            async with async_session() as db:
                query = (
                    select(
                        TouristBehavior.attraction_name,
                        TouristBehavior.attraction_type,
                        func.count(TouristBehavior.id).label('visit_count'),
                        func.avg(TouristBehavior.satisfaction).label('avg_satisfaction'),
                        func.avg(TouristBehavior.total_cost).label('avg_cost'),
                        func.avg(TouristBehavior.stay_duration).label('avg_stay'),
                    )
                    .where(TouristBehavior.attraction_name.in_(select(ScenicSpot.name)))
                    .group_by(TouristBehavior.attraction_name)
                    .order_by(func.count(TouristBehavior.id).desc())
                )
                if attraction_type:
                    query = query.where(TouristBehavior.attraction_type == attraction_type)

                result = await db.execute(query.limit(limit))
                rows = result.all()
                return [
                    {
                        'name': r[0],
                        'type': r[1],
                        'visit_count': r[2],
                        'avg_satisfaction': round(float(r[3]), 1) if r[3] else 0,
                        'avg_cost': round(float(r[4]), 0) if r[4] else 0,
                        'avg_stay_min': round(float(r[5]), 1) if r[5] else 0,
                    }
                    for r in rows
                ]
        except Exception as e:
            logger.error(f"get_popular_attractions failed: {e}", exc_info=True)
            return []

    async def recommend_for_profile(self, age: int = None, gender: str = None,
                                      budget: float = None, group_size: int = None,
                                      preferred_type: str = None, limit: int = 5) -> list[dict]:
        """Recommend attractions based on user profile (灵山 only)"""
        try:
            async with async_session() as db:
                query = (
                    select(
                        TouristBehavior.attraction_name,
                        TouristBehavior.attraction_type,
                        func.count(TouristBehavior.id).label('n'),
                        func.avg(TouristBehavior.satisfaction).label('sat'),
                        func.avg(TouristBehavior.total_cost).label('cost'),
                    )
                    .where(TouristBehavior.attraction_name.in_(select(ScenicSpot.name)))
                    .group_by(TouristBehavior.attraction_name)
                )

                # Filter by demographic profile if provided
                filters = []
                if age:
                    filters.append(TouristBehavior.age.between(age - 10, age + 10))
                if gender:
                    filters.append(TouristBehavior.gender == gender)
                if group_size:
                    filters.append(TouristBehavior.group_size == group_size)
                if preferred_type:
                    filters.append(TouristBehavior.attraction_type == preferred_type)

                if filters:
                    query = query.where(and_(*filters))

                result = await db.execute(query.order_by(func.count(TouristBehavior.id).desc()).limit(limit))
                rows = result.all()

                recommendations = []
                for r in rows:
                    rec = {
                        'name': r[0],
                        'type': r[1],
                        'matched_users': r[2],
                        'avg_satisfaction': round(float(r[3]), 1) if r[3] else 0,
                        'avg_cost': round(float(r[4]), 0) if r[4] else 0,
                    }
                    if budget and rec['avg_cost'] > budget * 1.5:
                        continue
                    recommendations.append(rec)

                return recommendations[:limit]
        except Exception as e:
            logger.error(f"recommend_for_profile failed: {e}", exc_info=True)
            return []

    async def get_type_stats(self) -> list[dict]:
        """Get aggregate statistics by attraction type"""
        try:
            async with async_session() as db:
                result = await db.execute(
                    select(
                        TouristBehavior.attraction_type,
                        func.count(TouristBehavior.id).label('total'),
                        func.avg(TouristBehavior.satisfaction).label('avg_sat'),
                        func.avg(TouristBehavior.total_cost).label('avg_cost'),
                        func.avg(TouristBehavior.stay_duration).label('avg_stay'),
                        func.avg(TouristBehavior.group_size).label('avg_group'),
                    )
                    .group_by(TouristBehavior.attraction_type)
                    .order_by(func.count(TouristBehavior.id).desc())
                )
                return [
                    {
                        'type': r[0],
                        'total_visits': r[1],
                        'avg_satisfaction': round(float(r[2]), 1) if r[2] else 0,
                        'avg_cost': round(float(r[3]), 0) if r[3] else 0,
                        'avg_stay_min': round(float(r[4]), 1) if r[4] else 0,
                        'avg_group_size': round(float(r[5]), 1) if r[5] else 0,
                    }
                    for r in result.fetchall()
                ]
        except Exception as e:
            logger.error(f"get_type_stats failed: {e}", exc_info=True)
            return []

    async def get_similar_visitors(self, attraction_name: str, limit: int = 3) -> list[dict]:
        """Find what else visitors to this attraction liked (灵山 only)"""
        try:
            async with async_session() as db:
                from sqlalchemy import text

                result = await db.execute(
                    text("SELECT COUNT(*) FROM tourist_behaviors WHERE attraction_name = :name"),
                    {"name": attraction_name}
                )
                if result.scalar() == 0:
                    return await self.get_popular_attractions(limit=limit)

                result = await db.execute(
                    text("""
                        SELECT tb.attraction_name, tb.attraction_type,
                               COUNT(*) as n, AVG(tb.satisfaction) as sat
                        FROM tourist_behaviors tb
                        INNER JOIN scenic_spots ss ON tb.attraction_name = ss.name
                        WHERE tb.tourist_id IN (
                            SELECT DISTINCT tourist_id FROM tourist_behaviors
                            WHERE attraction_name = :attraction
                        )
                        AND tb.attraction_name != :attraction2
                        GROUP BY tb.attraction_name
                        ORDER BY n DESC
                        LIMIT :limit
                    """),
                    {"attraction": attraction_name, "attraction2": attraction_name, "limit": limit}
                )
                rows = result.fetchall()
                if not rows:
                    return await self.get_popular_attractions(limit=limit)
                return [
                    {
                        'name': r[0],
                        'type': r[1],
                        'shared_visitors': r[2],
                        'avg_satisfaction': round(r[3], 1) if r[3] else 0,
                    }
                    for r in rows
                ]
        except Exception as e:
            logger.error(f"get_similar_visitors failed: {e}", exc_info=True)
            return []

    async def recommend_for_user(self, user: User, limit: int = 5) -> list[dict]:
        """Personalized recommendation based on user's chat history, visits, and favorites.
        Falls back to popular attractions for cold-start users."""
        try:
            async with async_session() as db:
                # 1. Extract interests from chat (last 20 user messages)
                user_msgs = await db.execute(
                    select(Message.content)
                    .join(Conversation, Message.conversation_id == Conversation.id)
                    .where(Conversation.user_id == user.id, Message.role == "user")
                    .order_by(Message.created_at.desc())
                    .limit(20)
                )
                recent_texts = [r[0] for r in user_msgs.fetchall()]

                # 2. Get all scenic spot names for keyword matching
                spots_result = await db.execute(select(ScenicSpot.name))
                all_spot_names = [r[0] for r in spots_result.fetchall()]

                # 3. Extract matched spot names from chat history
                matched_spots = []
                for text in recent_texts:
                    for name in all_spot_names:
                        if name in text and name not in matched_spots:
                            matched_spots.append(name)

                # 4. Parse visit_history from user's JSON field
                visited_names = []
                if user.visit_history:
                    try:
                        history_entries = json.loads(user.visit_history)
                        visited_names = [e.get("spot_name", "") for e in history_entries if e.get("spot_name")]
                    except (json.JSONDecodeError, TypeError):
                        pass

                # 5. Combine signals and query for cohort-based recommendations
                target_spots = matched_spots + visited_names

                recommendations = []
                if target_spots:
                    for spot_name in target_spots[:3]:
                        similar = await self.get_similar_visitors(spot_name, limit=3)
                        for s in similar:
                            if s['name'] not in [r['name'] for r in recommendations]:
                                recommendations.append(s)

                # 6. Fallback: popular attractions (exclude already visited)
                if len(recommendations) < limit:
                    popular = await self.get_popular_attractions(limit=limit + len(visited_names))
                    for p in popular:
                        if p['name'] not in [r['name'] for r in recommendations] and p['name'] not in visited_names:
                            recommendations.append(p)
                        if len(recommendations) >= limit:
                            break

                return recommendations[:limit]
        except Exception as e:
            logger.error(f"recommend_for_user failed: {e}", exc_info=True)
            return []
