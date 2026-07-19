import asyncio
import json
import os
import httpx
from typing import AsyncIterator
from app.core.config import settings


class LLMService:
    """多LLM Provider支持（共享连接池，减少TCP+TLS握手延迟）"""

    def __init__(self):
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(60, connect=10),
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=20),
            )
        return self._client

    async def chat_stream(
        self, system_prompt: str, user_message: str,
        max_tokens: int = 300, temperature: float = 0.4,
        history: list[dict] | None = None,
    ) -> AsyncIterator[str]:
        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history[-10:])  # last 5 rounds
        messages.append({"role": "user", "content": user_message})

        if settings.llm_provider == "dashscope":
            async for token in self._dashscope_stream(messages, max_tokens, temperature):
                yield token
        elif settings.llm_provider in ("openai", "deepseek", "doubao"):
            async for token in self._openai_stream(messages, max_tokens, temperature):
                yield token
        else:
            async for token in self._mock_stream(system_prompt, user_message):
                yield token

    async def _dashscope_stream(
        self, messages: list[dict],
        max_tokens: int = 300, temperature: float = 0.4
    ) -> AsyncIterator[str]:
        api_key = settings.llm_api_key or os.getenv("DASHSCOPE_API_KEY", "")
        if not api_key:
            for token in ["您好", "！", "我是", "景区", "AI", "导览", "助手", "。"]:
                yield token
                await asyncio.sleep(0.02)
            return

        client = await self._get_client()
        async with client.stream(
            "POST",
            "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.llm_model,
                "messages": messages,
                "stream": True,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError):
                        continue

    async def _openai_stream(
        self, messages: list[dict],
        max_tokens: int = 300, temperature: float = 0.4
    ) -> AsyncIterator[str]:
        api_key = settings.llm_api_key or os.getenv("OPENAI_API_KEY", "")
        base_url = settings.llm_base_url or "https://api.openai.com/v1"

        client = await self._get_client()
        async with client.stream(
            "POST",
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.llm_model,
                "messages": messages,
                "stream": True,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
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
            await asyncio.sleep(0.005)


_llm_service: "LLMService | None" = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
