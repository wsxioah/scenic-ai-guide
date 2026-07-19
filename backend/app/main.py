import logging
import os
from contextlib import asynccontextmanager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.models.database import engine, Base, get_db
from app.models.entities import DigitalHumanConfig, FAQ
from app.api import chat, voice, scenic, knowledge, auth, admin, digital_human, poi, recommend
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── 数据库初始化 ──
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    from app.services.poi_seed import seed_pois
    from app.services.faq_seed import seed_faqs
    await seed_pois()
    await seed_faqs()

    # ── 预加载重量级模型，避免首次请求等待 8-30 秒 ──
    logger.info("Preloading models (this may take 10-30s on first run)...")

    # 1. Whisper ASR (769MB, 首次3-15s)
    try:
        from app.api.voice import preload_asr_model
        await preload_asr_model()
        logger.info("Whisper ASR model ready")
    except Exception as e:
        logger.warning(f"Whisper preload failed (will retry on first request): {e}")

    # 2. ChromaDB + SentenceTransformer embedding (471MB, 首次4-13s)
    try:
        from app.services.rag_service import get_rag_service
        get_rag_service().warmup()
        logger.info("RAG service ready (ChromaDB + embedding)")
    except Exception as e:
        logger.warning(f"RAG preload failed (will retry on first request): {e}")

    # 3. LLM HTTP client 预热 (DNS+TCP+TLS, 0.5-2s)
    try:
        from app.services.llm_service import get_llm_service
        await get_llm_service()._get_client()
        logger.info("LLM HTTP client ready")
    except Exception as e:
        logger.warning(f"LLM client preload failed: {e}")

    logger.info("All models preloaded — ready to serve")
    yield
    await engine.dispose()


app = FastAPI(title=settings.app_name, lifespan=lifespan)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "unhealthy", "database": str(e)})


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
app.include_router(recommend.router, prefix="/api/recommend", tags=["推荐"])


# Static files
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "static")
AUDIO_STATIC_DIR = os.path.join(STATIC_DIR, "audio")
DIGITAL_HUMAN_DIR = os.path.join(STATIC_DIR, "digital-human")
os.makedirs(AUDIO_STATIC_DIR, exist_ok=True)
os.makedirs(DIGITAL_HUMAN_DIR, exist_ok=True)

app.mount("/digital-human", StaticFiles(directory=DIGITAL_HUMAN_DIR), name="digital-human")
app.mount("/static/audio", StaticFiles(directory=AUDIO_STATIC_DIR), name="audio_static")


@app.get("/api/faq")
async def public_faq(
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """公开FAQ接口 — 无需认证，返回已发布FAQ"""
    query = select(FAQ).where(FAQ.is_published == True).order_by(FAQ.sort_order.asc(), FAQ.id.asc())
    if category:
        query = query.where(FAQ.category == category)
    result = await db.execute(query)
    faqs = result.scalars().all()
    return [{
        "id": f.id, "question": f.question, "answer": f.answer,
        "category": f.category,
    } for f in faqs]


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
