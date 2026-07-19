import asyncio
import base64
import subprocess
import edge_tts
import tempfile
import os

# ── Ensure project-bundled ffmpeg is on PATH before whisper imports ──
# Whisper's load_audio() internally calls subprocess.run(["ffmpeg", ...])
# which requires ffmpeg on PATH — the bundled ffmpeg.exe covers this.
_FFMPEG = os.path.normpath(os.path.join(
    os.path.dirname(__file__), "..", "..", "ffmpeg.exe"
))
if not os.path.isfile(_FFMPEG):
    _FFMPEG = "ffmpeg"  # fallback to system PATH

_FFMPEG_DIR = os.path.dirname(_FFMPEG)
_path_entries = os.environ.get("PATH", "").split(os.pathsep)
if _FFMPEG_DIR not in _path_entries:
    os.environ["PATH"] = _FFMPEG_DIR + os.pathsep + os.environ.get("PATH", "")

import whisper
from fastapi import APIRouter
from pydantic import BaseModel
from app.core.config import settings

router = APIRouter()


async def preload_asr_model():
    """在应用启动时预加载Whisper模型，避免首次请求等待3-15秒"""
    await _get_asr_model()

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


def _decode_to_wav(audio_bytes: bytes, input_fmt: str) -> str:
    """Convert M4A/AAC to WAV using ffmpeg, returns path to wav file."""
    suffix = ".mp4" if "mp4" in input_fmt else ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        raw_path = f.name
        f.write(audio_bytes)
    wav_path = raw_path + ".wav"
    try:
        subprocess.run(
            [_FFMPEG, "-y", "-i", raw_path, "-ac", "1", "-ar", "16000", wav_path],
            capture_output=True, timeout=30, check=True,
        )
        return wav_path
    finally:
        try:
            os.unlink(raw_path)
        except Exception:
            pass


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

    # Reject ultra-short clips — less than ~0.5s of AAC at 16kbps
    if len(audio_bytes) < 1000:
        return {"text": "", "error": "录音太短，请按住说话至少1秒"}

    # Debug: save a copy of the last recording for inspection
    _debug_path = os.path.join(tempfile.gettempdir(), "_debug_last_recording.m4a")
    try:
        with open(_debug_path, "wb") as f:
            f.write(audio_bytes)
    except Exception:
        pass

    wav_path = None
    try:
        wav_path = await asyncio.get_event_loop().run_in_executor(
            None, _decode_to_wav, audio_bytes, req.format,
        )
        if not wav_path or not os.path.isfile(wav_path):
            return {"text": "", "error": "ffmpeg转换失败"}

        # Check WAV duration (16kHz mono 16bit = 32000 bytes/s)
        wav_size = os.path.getsize(wav_path)
        if wav_size < 16000:
            return {"text": "", "error": "录音太短，请按住说话至少1秒"}

        model = await _get_asr_model()
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: model.transcribe(
                wav_path,
                language="zh",
                task="transcribe",
                initial_prompt="以下是中文普通话。",
                no_speech_threshold=0.6,
                logprob_threshold=-1.0,
                compression_ratio_threshold=2.4,
                condition_on_previous_text=False,
            ),
        )
        text = result.get("text", "").strip()
        # Filter known hallucinations and ultra-short garbage
        if len(text) < 2:
            text = ""
        return {"text": text}
    except Exception as e:
        return {"text": "", "error": str(e)}
    finally:
        if wav_path:
            try:
                os.unlink(wav_path)
            except Exception:
                pass


async def _text_to_speech_base64(text: str) -> str:
    tmp_path = None
    try:
        communicate = edge_tts.Communicate(text, settings.tts_voice)
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            tmp_path = f.name
        await communicate.save(tmp_path)
        with open(tmp_path, "rb") as f:
            audio_bytes = f.read()
        return base64.b64encode(audio_bytes).decode("utf-8")
    except Exception as e:
        print(f"TTS error: {e}")
        return ""
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


@router.post("/tts")
async def text_to_speech(text: str):
    audio_b64 = await _text_to_speech_base64(text)
    return {"audio": audio_b64, "format": "mp3", "encoding": "base64"}
