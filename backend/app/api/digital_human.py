import asyncio
import io
import json
import re
import uuid
import os
import socket
import ssl
import wave
from urllib.parse import urlparse

import edge_tts
import miniaudio
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.llm_service import LLMService
from app.services.rag_service import RAGService
from app.core.config import settings

router = APIRouter()
llm_service = LLMService()
rag_service = RAGService()

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

EMOTION_TAG_RE = re.compile(r'[（(][^）)]*[）)]|【[^】]*】|\*\*[^*]*\*\*|#{1,6}\s*')

TTS_VOICE = "zh-CN-XiaoxiaoNeural"

SYSTEM_PROMPT = """你是景区AI导游"小景"。用热情口语化的中文回答，每次80-100字。用短句，少用逗号，句末用句号。禁止括号、markdown、表情。不知道就建议咨询工作人员。"""


def _prewarm_llm():
    """预热LLM API的TCP+TLS连接，减少首次请求延迟"""
    try:
        base = settings.llm_base_url or "https://api.deepseek.com/v1"
        host = urlparse(base).hostname or "api.deepseek.com"
        for addr in socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP):
            sock = socket.socket(addr[0], socket.SOCK_STREAM)
            sock.settimeout(3)
            sock.connect(addr[4])
            ctx = ssl.create_default_context()
            ssock = ctx.wrap_socket(sock, server_hostname=host)
            ssock.close()
            break
    except Exception:
        pass


_prewarm_llm()


def _clean_text_for_tts(text: str) -> str:
    text = EMOTION_TAG_RE.sub("", text)
    text = text.replace("*", "").replace("#", "").replace("_", "")
    return text.strip()


async def _edge_tts(text: str, output_wav: str) -> str:
    mp3_data = io.BytesIO()
    comm = edge_tts.Communicate(text, TTS_VOICE)
    async for chunk in comm.stream():
        if isinstance(chunk, dict) and chunk.get("type") == "audio":
            mp3_data.write(chunk["data"])
    mp3_data.seek(0)
    decoded = miniaudio.decode(mp3_data.read(), output_format=miniaudio.SampleFormat.SIGNED16)
    samples = decoded.samples
    # Convert stereo to mono by averaging channels
    if decoded.nchannels == 2:
        arr = np.frombuffer(samples, dtype=np.int16).reshape(-1, 2)
        mono = arr.astype(np.float32).mean(axis=1).astype(np.int16)
        samples = mono.tobytes()
    # Resample to 32kHz if needed (matches GPT-SoVITS output)
    target_rate = 32000
    if decoded.sample_rate != target_rate:
        arr = np.frombuffer(samples, dtype=np.int16).astype(np.float32)
        duration = len(arr) / decoded.sample_rate
        new_len = int(duration * target_rate)
        indices = np.linspace(0, len(arr) - 1, new_len)
        resampled = np.interp(indices, np.arange(len(arr)), arr).astype(np.int16)
        samples = resampled.tobytes()
    with wave.open(output_wav, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(target_rate)
        wf.writeframes(samples)
    return output_wav


_SENTENCE_END_RE = re.compile(r'[。！？\n]')

@router.websocket("/ws")
async def websocket_digital_human(ws: WebSocket):
    await ws.accept()
    session_id = uuid.uuid4().hex[:8]
    history: list[dict] = []  # conversation context

    async def send(msg: dict):
        await ws.send_text(json.dumps(msg, ensure_ascii=False))

    try:
        while True:
            raw = await ws.receive_text()
            data = json.loads(raw)

            if data.get("type") != "query":
                continue

            user_text = data.get("text", "").strip()
            if not user_text:
                await send({"type": "error", "message": "请输入内容"})
                continue

            await send({"type": "status", "state": "thinking"})

            # RAG search
            knowledge = await rag_service.search(user_text, top_k=1)
            if knowledge:
                ctx = "\n".join([f"- {k['title']}: {k['content'][:80]}" for k in knowledge])
                system_prompt = SYSTEM_PROMPT + f"\n参考：{ctx}"
            else:
                system_prompt = SYSTEM_PROMPT

            # Streaming LLM: detect sentences and start TTS early.
            # TTS tasks run in background and deliver in ORDER via a sequencer.
            full_text = ""
            buffer = ""
            chunk_idx = 0
            tts_tasks = []  # (index, task) for background TTS
            completed: dict[int, str] = {}  # index -> audio_url
            next_deliver = 0
            deliver_event = asyncio.Event()

            async def sequencer():
                """Deliver completed TTS chunks in index order."""
                nonlocal next_deliver
                while True:
                    while next_deliver in completed:
                        audio_url = completed.pop(next_deliver)
                        await send({
                            "type": "tts_chunk",
                            "audio_url": audio_url,
                            "chunk_index": next_deliver,
                            "chunk_total": 0,
                        })
                        next_deliver += 1
                    deliver_event.clear()
                    await deliver_event.wait()

            seq_task = asyncio.create_task(sequencer())

            try:
                async for token in llm_service.chat_stream(
                    system_prompt, user_text, max_tokens=110, temperature=0.3,
                    history=history,
                ):
                    full_text += token
                    buffer += token
                    await send({"type": "llm_token", "token": token})

                    m = _SENTENCE_END_RE.search(buffer)
                    if m and len(buffer[:m.end()].strip()) >= 12:
                        end = m.end()
                        sentence = _clean_text_for_tts(buffer[:end].strip())
                        buffer = buffer[end:]
                        if sentence:
                            idx = chunk_idx
                            chunk_idx += 1
                            filepath = os.path.join(AUDIO_DIR, f"{session_id}_{idx}.wav")

                            async def run_tts(i=idx, fp=filepath, txt=sentence):
                                try:
                                    await _edge_tts(txt, fp)
                                    completed[i] = f"/static/audio/{session_id}_{i}.wav"
                                    deliver_event.set()
                                except Exception as e:
                                    print(f"[TTS] chunk {i} failed: {e}")
                            tts_tasks.append((idx, asyncio.create_task(run_tts())))
            except Exception as e:
                seq_task.cancel()
                await send({"type": "error", "message": f"AI回复失败：{str(e)}"})
                continue

            # TTS any remaining text
            remaining = _clean_text_for_tts(buffer.strip())
            if remaining:
                idx = chunk_idx
                chunk_idx += 1
                filepath = os.path.join(AUDIO_DIR, f"{session_id}_{idx}.wav")
                try:
                    await _edge_tts(remaining, filepath)
                    completed[idx] = f"/static/audio/{session_id}_{idx}.wav"
                    deliver_event.set()
                except Exception as e:
                    print(f"[TTS] final chunk failed: {e}")
            total = chunk_idx

            # Wait for all background TTS to finish
            if tts_tasks:
                await asyncio.gather(*(t for _, t in tts_tasks), return_exceptions=True)
            # Signal sequencer no more chunks coming, then wait for it
            # Update all remaining chunks with total
            seq_task.cancel()
            try:
                await seq_task
            except asyncio.CancelledError:
                pass
            # Deliver any remaining completed chunks in order
            while next_deliver in completed:
                audio_url = completed.pop(next_deliver)
                await send({
                    "type": "tts_chunk",
                    "audio_url": audio_url,
                    "chunk_index": next_deliver,
                    "chunk_total": total,
                })
                next_deliver += 1

            await send({"type": "llm_done", "full_text": full_text})

            # Store conversation context
            history.append({"role": "user", "content": user_text})
            history.append({"role": "assistant", "content": full_text})
            if len(history) > 10:
                history[:] = history[-10:]

            if total > 0:
                await send({"type": "status", "state": "speaking"})

            await send({"type": "ready"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] Unexpected error: {e}")
        try:
            await ws.close()
        except Exception:
            pass
