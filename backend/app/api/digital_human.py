import json
import uuid
import os

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.config import settings
from app.services.llm_service import LLMService
from app.services.rag_service import RAGService

import edge_tts

router = APIRouter()
llm_service = LLMService()
rag_service = RAGService()

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

SYSTEM_PROMPT = """你是景区的AI数字人导游"小景"，一个热情友好的虚拟导游。

你的职责：
1. 为游客介绍景区景点、历史文化、游览路线
2. 回答游客关于门票、开放时间、交通等问题
3. 推荐适合的游览方案

回答要求：
- 语气热情亲切，像真人导游一样
- 回答简洁有料，每次控制在100字左右
- 如果不知道，诚实告知并建议游客咨询景区工作人员
- 使用中文"""


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
            voice_name = data.get("voice", settings.tts_voice)

            if not user_text:
                await send({"type": "error", "message": "请输入内容"})
                continue

            await send({"type": "status", "state": "thinking"})

            # RAG knowledge retrieval
            knowledge = await rag_service.search(user_text, top_k=3)
            if knowledge:
                ctx = "\n".join([f"- {k['title']}: {k['content'][:300]}" for k in knowledge])
                system_prompt = SYSTEM_PROMPT + f"\n\n可参考的景区知识：\n{ctx}"
            else:
                system_prompt = SYSTEM_PROMPT

            # LLM streaming
            full_text = ""
            try:
                async for token in llm_service.chat_stream(system_prompt, user_text):
                    full_text += token
                    await send({"type": "llm_token", "token": token})
            except Exception as e:
                await send({"type": "error", "message": f"AI回复失败：{str(e)}"})
                continue

            await send({"type": "llm_done", "full_text": full_text})

            if not full_text.strip():
                await send({"type": "ready"})
                continue

            await send({"type": "status", "state": "speaking"})

            # TTS generate
            try:
                file_name = f"{session_id}_{uuid.uuid4().hex[:6]}.mp3"
                file_path = os.path.join(AUDIO_DIR, file_name)
                communicate = edge_tts.Communicate(full_text, voice_name)
                await communicate.save(file_path)

                audio_url = f"/static/audio/{file_name}"
                await send({
                    "type": "tts_ready",
                    "audio_url": audio_url,
                    "text": full_text,
                })
            except Exception as e:
                await send({"type": "error", "message": f"语音合成失败：{str(e)}"})
                await send({"type": "ready"})
                continue

            await send({"type": "ready"})

    except WebSocketDisconnect:
        pass
