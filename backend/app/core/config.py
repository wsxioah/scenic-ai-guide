import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "景区AI数字人导览"
    debug: bool = True
    secret_key: str = os.environ.get(
        "JWT_SECRET_KEY",
        "scenic-ai-secret-key-change-in-production"
    )
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    # Database
    database_url: str = "sqlite+aiosqlite:///./scenic_ai.db"

    # LLM
    llm_provider: str = "deepseek"  # deepseek | dashscope | openai | doubao
    llm_api_key: Optional[str] = None
    llm_base_url: str = "https://api.deepseek.com/v1"
    llm_model: str = "deepseek-chat"

    # TTS
    tts_provider: str = "edge"  # edge | cosyvoice | dashscope
    tts_voice: str = "zh-CN-XiaoxiaoNeural"

    # ASR
    asr_provider: str = "whisper"  # whisper | paraformer

    # Vector DB
    chroma_persist_dir: str = "./chroma_data"

    # CORS — tighten for production, override via .env
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:8081",
    ]

    class Config:
        env_file = ".env"


settings = Settings()
