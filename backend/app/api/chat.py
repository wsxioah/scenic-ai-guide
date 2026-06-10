import asyncio
import json
import time
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import get_db
from app.models.entities import Conversation, Message
from app.services.rag_service import RAGService
from app.services.llm_service import LLMService

router = APIRouter()
rag_service = RAGService()
llm_service = LLMService()


class ChatRequest(BaseModel):
    message: str
    conversation_id: int | None = None
    user_id: int | None = None


@router.post("/stream")
async def chat_stream(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    """SSE流式对话接口"""
    # 创建或获取对话
    conv_id = req.conversation_id
    if not conv_id:
        conv = Conversation(
            user_id=req.user_id or 1,
            title=req.message[:30] or "新对话"
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        conv_id = conv.id

    # 保存用户消息
    user_msg = Message(conversation_id=conv_id, role="user", content=req.message)
    db.add(user_msg)
    await db.commit()

    # 检索知识
    knowledge_results = await rag_service.search(req.message, top_k=3)

    async def generate():
        try:
            # 发送元数据
            yield f"event: metadata\ndata: {json.dumps({'conversation_id': conv_id, 'knowledge_count': len(knowledge_results)}, ensure_ascii=False)}\n\n"

            # 构建prompt
            context = "\n".join([f"- {k['title']}: {k['content'][:300]}" for k in knowledge_results])
            system_prompt = f"""你是景区AI导览助手。基于以下知识回答游客问题，保持友好热情。
如果知识库中没有相关信息，请诚实告知并建议游客咨询景区工作人员。

知识库参考：
{context}"""

            full_answer = ""
            async for token in llm_service.chat_stream(
                system_prompt=system_prompt,
                user_message=req.message
            ):
                full_answer += token
                yield f"event: answer_fragment\ndata: {json.dumps({'content': token}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.02)

            # 保存AI回复
            ai_msg = Message(conversation_id=conv_id, role="assistant", content=full_answer)
            db.add(ai_msg)
            await db.commit()

            # TTS音频生成通知
            yield f"event: tts_ready\ndata: {json.dumps({'message_id': ai_msg.id}, ensure_ascii=False)}\n\n"

            yield f"event: done\ndata: {json.dumps({'status': 'completed'})}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/history")
async def get_conversations(user_id: int, db: AsyncSession = Depends(get_db)):
    """获取用户对话历史"""
    from sqlalchemy import select
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.created_at.desc())
    )
    convs = result.scalars().all()
    return [{"id": c.id, "title": c.title, "created_at": c.created_at.isoformat()} for c in convs]


@router.get("/messages/{conversation_id}")
async def get_messages(conversation_id: int, db: AsyncSession = Depends(get_db)):
    """获取指定对话的消息"""
    from sqlalchemy import select
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    msgs = result.scalars().all()
    return [{
        "id": m.id, "role": m.role, "content": m.content,
        "audio_url": m.audio_url, "feedback": m.feedback,
        "created_at": m.created_at.isoformat()
    } for m in msgs]
