import asyncio
import io
import json
import logging
import re
import uuid
import os
import wave

import edge_tts
import miniaudio
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.llm_service import get_llm_service
from app.services.rag_service import get_rag_service

router = APIRouter()
llm_service = get_llm_service()
rag_service = get_rag_service()

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

EMOTION_TAG_RE = re.compile(r'[（(][^）)]*[）)]|【[^】]*】|\*\*[^*]*\*\*|#{1,6}\s*')

TTS_VOICE = "zh-CN-XiaoxiaoNeural"
ALLOWED_VOICES = {
    "zh-CN-XiaoxiaoNeural", "zh-CN-XiaoyiNeural", "zh-CN-YunxiaNeural",
    "zh-CN-YunxiNeural", "zh-CN-YunyangNeural",
}

SYSTEM_PROMPT ="""你是景区AI导游"小景"。用热情口语化的中文回答，每次80-100字。用短句，少用逗号，句末用句号。禁止括号、markdown、表情。不知道就建议咨询工作人员。"""



def _clean_text_for_tts(text: str) -> str:
    text = EMOTION_TAG_RE.sub("", text)
    text = text.replace("*", "").replace("#", "").replace("_", "")
    return text.strip()


async def _edge_tts(text: str, output_wav: str, voice: str = TTS_VOICE) -> str:
    logging.info(f"[TTS] using voice=%s text=%s...", voice, text[:40])
    mp3_data = io.BytesIO()
    comm = edge_tts.Communicate(text, voice)
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

            raw_voice = data.get("voice")
            voice = raw_voice if raw_voice in ALLOWED_VOICES else TTS_VOICE
            logging.info(f"[Voice] requested=%s resolved=%s allowed=%s", raw_voice, voice, sorted(ALLOWED_VOICES))

            await send({"type": "status", "state": "thinking"})

            # RAG search
            try:
                knowledge = await rag_service.search(user_text, top_k=1)
            except Exception:
                logging.getLogger(__name__).warning("RAG search failed, falling back to base prompt", exc_info=True)
                knowledge = []
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

                            async def run_tts(i=idx, fp=filepath, txt=sentence, vc=voice):
                                try:
                                    await _edge_tts(txt, fp, vc)
                                    completed[i] = f"/static/audio/{session_id}_{i}.wav"
                                    deliver_event.set()
                                except Exception as e:
                                    print(f"[TTS] chunk {i} failed: {e}")
                            tts_tasks.append((idx, asyncio.create_task(run_tts())))
            except Exception as e:
                seq_task.cancel()
                await send({"type": "error", "message": f"AI回复失败：{str(e)}"})
                continue

            # LLM stream finished — finalize the text turn IMMEDIATELY so the
            # client unlocks the UI. Audio synthesis must never block turn
            # completion: a slow or unreachable TTS would otherwise hang the chat.
            await send({"type": "llm_done", "full_text": full_text})
            history.append({"role": "user", "content": user_text})
            history.append({"role": "assistant", "content": full_text})
            if len(history) > 10:
                history[:] = history[-10:]

            # Schedule TTS for any remaining text as a background task (not awaited inline).
            remaining = _clean_text_for_tts(buffer.strip())
            if remaining:
                idx = chunk_idx
                chunk_idx += 1
                fp = os.path.join(AUDIO_DIR, f"{session_id}_{idx}.wav")

                async def run_tts_final(i=idx, fp=fp, txt=remaining, vc=voice):
                    try:
                        await _edge_tts(txt, fp, vc)
                        completed[i] = f"/static/audio/{session_id}_{i}.wav"
                        deliver_event.set()
                    except Exception as e:
                        print(f"[TTS] final chunk failed: {e}")
                tts_tasks.append((idx, asyncio.create_task(run_tts_final())))
            total = chunk_idx

            # Drain background TTS and deliver any remaining audio chunks. The text
            # turn already completed above, so this no longer blocks the UI.
            if tts_tasks:
                await asyncio.gather(*(t for _, t in tts_tasks), return_exceptions=True)
            seq_task.cancel()
            try:
                await seq_task
            except asyncio.CancelledError:
                pass
            while next_deliver in completed:
                audio_url = completed.pop(next_deliver)
                await send({
                    "type": "tts_chunk",
                    "audio_url": audio_url,
                    "chunk_index": next_deliver,
                    "chunk_total": total,
                })
                next_deliver += 1

            await send({"type": "ready"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] Unexpected error: {e}")
        try:
            await ws.close()
        except Exception:
            pass
