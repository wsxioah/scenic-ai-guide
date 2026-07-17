import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.models.database import engine, Base, get_db
from app.models.entities import DigitalHumanConfig
from app.api import chat, voice, scenic, knowledge, auth, admin, digital_human, poi
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    from app.services.poi_seed import seed_pois
    await seed_pois()
    yield
    await engine.dispose()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(chat.router, prefix="/api/chat", tags=["对话"])
app.include_router(voice.router, prefix="/api/voice", tags=["语音"])
app.include_router(scenic.router, prefix="/api/scenic", tags=["景区"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["知识库"])
app.include_router(admin.router, prefix="/api/admin", tags=["管理后台"])
app.include_router(digital_human.router, tags=["数字人"])
app.include_router(poi.router, prefix="/api/poi", tags=["POI"])


# Static files
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "static")
AUDIO_STATIC_DIR = os.path.join(STATIC_DIR, "audio")
DIGITAL_HUMAN_DIR = os.path.join(STATIC_DIR, "digital-human")
os.makedirs(AUDIO_STATIC_DIR, exist_ok=True)
os.makedirs(DIGITAL_HUMAN_DIR, exist_ok=True)

app.mount("/digital-human", StaticFiles(directory=DIGITAL_HUMAN_DIR), name="digital-human")
app.mount("/static/audio", StaticFiles(directory=AUDIO_STATIC_DIR), name="audio_static")


@app.get("/")
async def root():
    return {"name": settings.app_name, "status": "running"}


@app.get("/map", response_class=HTMLResponse)
async def map_page():
    map_path = os.path.join(os.path.dirname(__file__), "..", "..", "tools", "map_inline_test.html")
    with open(map_path, encoding="utf-8") as f:
        return f.read()


@app.post("/api/admin/digital-human/config")
async def save_digital_human_config(
    model_type: str = "vrm",
    model_url: str | None = None,
    voice_type: str = "zh-CN-XiaoxiaoNeural",
    speed: float = 1.0,
    pitch: float = 1.0,
    greeting_message: str = "",
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(DigitalHumanConfig).limit(1))
    config = result.scalar_one_or_none()
    if not config:
        config = DigitalHumanConfig()
        db.add(config)
    config.model_type = model_type
    if model_url:
        config.model_url = model_url
    config.voice_type = voice_type
    config.speed = speed
    config.pitch = pitch
    config.greeting_message = greeting_message
    await db.commit()
    return {"message": "数字人配置已保存"}
