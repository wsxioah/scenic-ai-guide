import asyncio
import json
import re
import uuid
import os

import edge_tts
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.llm_service import LLMService
from app.services.rag_service import RAGService
from app.core.config import settings

router = APIRouter()
llm_service = LLMService()
rag_service = RAGService()

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

SENTENCE_END_RE = re.compile(r'[。！？!?\n]')
EMOTION_TAG_RE = re.compile(r'[（(][^）)]*[）)]|【[^】]*】|\*\*[^*]*\*\*|#{1,6}\s*')

VOICE = "zh-CN-XiaoxiaoNeural"

SYSTEM_PROMPT = """你是景区AI导游"小景"。用热情口语化的中文回答，每次80-100字。用短句，少用逗号，句末用句号。禁止括号、markdown、表情。不知道就建议咨询工作人员。"""


def _prewarm_edge_tts():
    """预热 edge-tts 的 TCP+TLS 连接，减少首次TTS延迟"""
    import socket
    import ssl
    try:
        addrs = socket.getaddrinfo("speech.platform.bing.com", 443, proto=socket.IPPROTO_TCP)
        for addr in addrs:
            sock = socket.socket(addr[0], socket.SOCK_STREAM)
            sock.settimeout(3)
            sock.connect(addr[4])
            ctx = ssl.create_default_context()
            ssock = ctx.wrap_socket(sock, server_hostname="speech.platform.bing.com")
            ssock.close()
            break
    except Exception:
        pass


def _prewarm_llm_api():
    """预热LLM API的TCP+TLS连接"""
    import socket
    import ssl
    from urllib.parse import urlparse
    try:
        base = settings.llm_base_url or "https://api.deepseek.com/v1"
        host = urlparse(base).hostname or "api.deepseek.com"
        addrs = socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP)
        for addr in addrs:
            sock = socket.socket(addr[0], socket.SOCK_STREAM)
            sock.settimeout(3)
            sock.connect(addr[4])
            ctx = ssl.create_default_context()
            ssock = ctx.wrap_socket(sock, server_hostname=host)
            ssock.close()
            break
    except Exception:
        pass


_prewarm_edge_tts()
_prewarm_llm_api()


def _clean_text_for_tts(text: str) -> str:
    text = EMOTION_TAG_RE.sub("", text)
    text = text.replace("*", "").replace("#", "").replace("_", "")
    return text.strip()


async def _edge_tts_stream(text: str, output_mp3: str) -> str:
    communicate = edge_tts.Communicate(text, VOICE)
    with open(output_mp3, "wb") as f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
    return output_mp3


@router.websocket("/ws")
async def websocket_digital_human(ws: WebSocket):
    await ws.accept()
    session_id = uuid.uuid4().hex[:8]

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

            knowledge = await rag_service.search(user_text, top_k=1)
            if knowledge:
                ctx = "\n".join([f"- {k['title']}: {k['content'][:80]}" for k in knowledge])
                system_prompt = SYSTEM_PROMPT + f"\n参考：{ctx}"
            else:
                system_prompt = SYSTEM_PROMPT

            # Phase 1: Stream LLM, kick off first chunk TTS early
            full_text = ""
            current = ""
            first_tts_task = None
            first_sentence_end = 0
            first_file = os.path.join(AUDIO_DIR, f"{session_id}_0.mp3")

            try:
                async for token in llm_service.chat_stream(
                    system_prompt, user_text, max_tokens=110, temperature=0.3
                ):
                    full_text += token
                    current += token
                    await send({"type": "llm_token", "token": token})

                    if first_tts_task is None:
                        cur_len = len(current.strip())
                        # 只在句末标点（。！？）处触发首次TTS，不在逗号处拆分，避免不自然停顿
                        if SENTENCE_END_RE.search(token) and cur_len >= 8:
                            pass  # trigger at sentence end
                        elif cur_len >= 22:
                            pass  # force trigger for very long first sentence
                        else:
                            continue
                        first_sentence_end = len(full_text)
                        text = _clean_text_for_tts(current.strip())
                        if text:
                            first_tts_task = asyncio.create_task(
                                _edge_tts_stream(text, first_file)
                            )
            except Exception as e:
                await send({"type": "error", "message": f"AI回复失败：{str(e)}"})
                continue

            await send({"type": "llm_done", "full_text": full_text})

            # Phase 2: Prepare remaining text as single second chunk
            if first_tts_task is not None:
                rest_text = _clean_text_for_tts(full_text[first_sentence_end:].strip())
            else:
                rest_text = _clean_text_for_tts(full_text.strip())

            if not rest_text and first_tts_task is None:
                await send({"type": "ready"})
                continue

            if first_tts_task is None:
                # No early trigger — synthesize everything as one chunk
                first_tts_task = asyncio.create_task(
                    _edge_tts_stream(rest_text, first_file)
                )
                rest_text = ""

            total = 2 if rest_text else 1

            await send({"type": "status", "state": "speaking"})

            # Start second chunk TTS in parallel if needed
            second_tts_task = None
            if rest_text:
                second_file = os.path.join(AUDIO_DIR, f"{session_id}_1.mp3")
                second_tts_task = asyncio.create_task(
                    _edge_tts_stream(rest_text, second_file)
                )

            # Phase 3: Send chunk 0 as soon as ready, fire chunk 1 in background
            await first_tts_task
            await send({
                "type": "tts_chunk",
                "audio_url": f"/static/audio/{session_id}_0.mp3",
                "chunk_index": 0,
                "chunk_total": total,
            })

            if second_tts_task:
                async def send_chunk1():
                    try:
                        await second_tts_task
                        await send({
                            "type": "tts_chunk",
                            "audio_url": f"/static/audio/{session_id}_1.mp3",
                            "chunk_index": 1,
                            "chunk_total": total,
                        })
                    except Exception:
                        pass
                asyncio.create_task(send_chunk1())

            await send({"type": "ready"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] Unexpected error: {e}")
        try:
            await ws.close()
        except Exception:
            pass
