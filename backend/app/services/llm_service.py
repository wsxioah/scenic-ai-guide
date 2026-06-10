import os
import httpx
from typing import AsyncIterator
from app.core.config import settings


class LLMService:
    """多LLM Provider支持"""

    async def chat_stream(self, system_prompt: str, user_message: str) -> AsyncIterator[str]:
        if settings.llm_provider == "dashscope":
            async for token in self._dashscope_stream(system_prompt, user_message):
                yield token
        elif settings.llm_provider in ("openai", "deepseek", "doubao"):
            async for token in self._openai_stream(system_prompt, user_message):
                yield token
        else:
            async for token in self._mock_stream(system_prompt, user_message):
                yield token

    async def _dashscope_stream(self, system_prompt: str, user_message: str) -> AsyncIterator[str]:
        """阿里云DashScope流式调用"""
        api_key = settings.llm_api_key or os.getenv("DASHSCOPE_API_KEY", "")
        if not api_key:
            async for t in self._mock_stream(system_prompt, user_message):
                yield t
            return

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.llm_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    "stream": True,
                    "temperature": 0.7,
                },
            )
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    import json
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError):
                        continue

    async def _openai_stream(self, system_prompt: str, user_message: str) -> AsyncIterator[str]:
        """OpenAI兼容API流式调用"""
        api_key = settings.llm_api_key or os.getenv("OPENAI_API_KEY", "")
        base_url = settings.llm_base_url or "https://api.openai.com/v1"

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.llm_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    "stream": True,
                    "temperature": 0.7,
                },
            )
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    import json
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError):
                        continue

    async def _mock_stream(self, system_prompt: str, user_message: str) -> AsyncIterator[str]:
        """Mock流式输出（无需API Key的演示模式）"""
        mock_response = f"""您好！我是景区AI导览助手。

关于您的问题，我来为您解答：

1. 您可以通过语音或文字与我交流
2. 我可以为您介绍景区景点、推荐游览路线
3. 如需查询具体景点信息，请告诉我景点名称

目前系统处于演示模式，接入大模型API后可获得更智能的回答。
如需接入API，请在 backend/.env 中配置 DASHSCOPE_API_KEY 或 OPENAI_API_KEY。"""
        for char in mock_response:
            yield char
            import asyncio
            await asyncio.sleep(0.02)
