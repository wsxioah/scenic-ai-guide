import datetime
from sqlalchemy import String, Integer, Float, Text, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    nickname: Mapped[str] = mapped_column(String(50))
    avatar: Mapped[str | None] = mapped_column(String(500))
    interests: Mapped[str | None] = mapped_column(Text)  # JSON array
    visit_history: Mapped[str | None] = mapped_column(Text)  # JSON array
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    conversations = relationship("Conversation", back_populates="user")
    comments = relationship("Comment", back_populates="user")


class ScenicSpot(Base):
    __tablename__ = "scenic_spots"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(50))  # 自然/人文/历史等
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    address: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text)
    images: Mapped[str | None] = mapped_column(Text)  # JSON array of URLs
    price: Mapped[float] = mapped_column(Float, default=0)
    open_time: Mapped[str | None] = mapped_column(String(100))
    level: Mapped[str | None] = mapped_column(String(10))  # 5A/4A等
    pv: Mapped[int] = mapped_column(Integer, default=0)
    score: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    knowledge_points = relationship("KnowledgePoint", back_populates="scenic_spot")
    comments = relationship("Comment", back_populates="scenic_spot")


class KnowledgePoint(Base):
    __tablename__ = "knowledge_points"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    scenic_id: Mapped[int | None] = mapped_column(ForeignKey("scenic_spots.id"))
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    tags: Mapped[str | None] = mapped_column(String(500))  # JSON array
    source: Mapped[str | None] = mapped_column(String(100))  # 数据来源
    embedding_id: Mapped[str | None] = mapped_column(String(200))  # ChromaDB embedding ref
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    scenic_spot = relationship("ScenicSpot", back_populates="knowledge_points")


class TourRoute(Base):
    __tablename__ = "tour_routes"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100))
    spots: Mapped[str] = mapped_column(Text)  # JSON array of spot IDs
    duration: Mapped[int] = mapped_column(Integer)  # 分钟
    difficulty: Mapped[str] = mapped_column(String(20))  # easy/medium/hard
    description: Mapped[str] = mapped_column(Text)
    images: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)


class Conversation(Base):
    __tablename__ = "conversations"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"), index=True)
    role: Mapped[str] = mapped_column(String(20))  # user/assistant
    content: Mapped[str] = mapped_column(Text)
    audio_url: Mapped[str | None] = mapped_column(String(500))
    feedback: Mapped[int | None] = mapped_column(Integer)  # 1=赞, -1=踩
    metadata_json: Mapped[str | None] = mapped_column(Text)  # JSON extra data
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")


class Comment(Base):
    __tablename__ = "comments"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    scenic_id: Mapped[int] = mapped_column(ForeignKey("scenic_spots.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    images: Mapped[str | None] = mapped_column(Text)
    rating: Mapped[int] = mapped_column(Integer, default=5)  # 1-5
    likes: Mapped[int] = mapped_column(Integer, default=0)
    parent_id: Mapped[int | None] = mapped_column(Integer, default=None)  # reply thread
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="comments")
    scenic_spot = relationship("ScenicSpot", back_populates="comments")


class Announcement(Base):
    __tablename__ = "announcements"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(20), default="normal")  # normal/emergency
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)


class DigitalHumanConfig(Base):
    __tablename__ = "digital_human_config"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    model_type: Mapped[str] = mapped_column(String(20), default="vrm")  # vrm/live2d
    model_url: Mapped[str | None] = mapped_column(String(500))
    voice_type: Mapped[str] = mapped_column(String(100), default="zh-CN-XiaoxiaoNeural")
    speed: Mapped[float] = mapped_column(Float, default=1.0)
    pitch: Mapped[float] = mapped_column(Float, default=1.0)
    greeting_message: Mapped[str] = mapped_column(String(500), default="您好！我是景区AI导览助手，请问有什么可以帮您的？")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
