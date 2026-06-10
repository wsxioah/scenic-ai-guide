import asyncio
import json
import base64
import edge_tts
import tempfile
import os
import sys
import whisper
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import get_db
from app.core.config import settings

# Whisper needs ffmpeg to decode M4A — use WPS-bundled ffmpeg
_ffmpeg_dir = os.path.join(
    os.environ.get("APPDATA", ""),
    "kingsoft", "wps", "addons", "pool", "win-i386",
    "videotools_3.1.0.138", "videotools"
)
if os.path.isdir(_ffmpeg_dir):
    os.environ["PATH"] = _ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

router = APIRouter()

_model_lock = asyncio.Lock()
_asr_model = None


async def _get_asr_model():
    global _asr_model
    if _asr_model is None:
        async with _model_lock:
            if _asr_model is None:
                loop = asyncio.get_event_loop()
                _asr_model = await loop.run_in_executor(
                    None, whisper.load_model, "small"
                )
    return _asr_model


class STTRequest(BaseModel):
    audio: str
    format: str = "audio/mp4"


@router.post("/stt")
async def speech_to_text(req: STTRequest):
    """REST接口：base64音频 → 转写文本（Whisper small 中文优化）"""
    try:
        audio_bytes = base64.b64decode(req.audio)
    except Exception:
        return {"text": "", "error": "invalid base64"}

    suffix = ".mp4" if "mp4" in req.format else ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        tmp_path = f.name
        f.write(audio_bytes)

    try:
        model = await _get_asr_model()
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: model.transcribe(
                tmp_path,
                language="zh",
                task="transcribe",
                initial_prompt="以下是中文普通话。",
            ),
        )
        text = result.get("text", "").strip()
        return {"text": text}
    except Exception as e:
        return {"text": "", "error": str(e)}
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@router.websocket("/ws/{user_id}")
async def voice_websocket(websocket: WebSocket, user_id: int):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "stt":
                audio_b64 = data.get("audio", "")
                transcript = await _stt_transcribe(audio_b64)
                await websocket.send_json({
                    "type": "stt_result",
                    "text": transcript,
                })

            elif action == "tts":
                text = data.get("text", "")
                audio_b64 = await _text_to_speech_base64(text)
                await websocket.send_json({
                    "type": "tts_result",
                    "audio": audio_b64,
                })

    except WebSocketDisconnect:
        pass


async def _stt_transcribe(audio_b64: str) -> str:
    try:
        audio_bytes = base64.b64decode(audio_b64)
    except Exception:
        return ""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        tmp_path = f.name
        f.write(audio_bytes)
    try:
        model = await _get_asr_model()
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: model.transcribe(
                tmp_path,
                language="zh",
                task="transcribe",
                initial_prompt="以下是中文普通话。",
            ),
        )
        return result.get("text", "").strip()
    except Exception as e:
        print(f"STT error: {e}")
        return ""
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


async def _text_to_speech_base64(text: str) -> str:
    try:
        communicate = edge_tts.Communicate(text, settings.tts_voice)
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            tmp_path = f.name
        await communicate.save(tmp_path)
        with open(tmp_path, "rb") as f:
            audio_bytes = f.read()
        os.unlink(tmp_path)
        return base64.b64encode(audio_bytes).decode("utf-8")
    except Exception as e:
        print(f"TTS error: {e}")
        return ""


@router.post("/tts")
async def text_to_speech(text: str):
    audio_b64 = await _text_to_speech_base64(text)
    return {"audio": audio_b64, "format": "mp3", "encoding": "base64"}
