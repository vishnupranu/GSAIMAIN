# ──────────────────────────────────────────────────────────────────────────────
# backend/app/providers/openrouter_provider.py
# OpenRouter API — OpenAI-compatible streaming provider
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

from typing import AsyncGenerator, List, Optional

import httpx

from .base import AuthError, LLMProvider, ProviderError, RateLimitError
from ..config import get_settings
from ..models import ChatMessage


class OpenRouterProvider(LLMProvider):
    name = "openrouter"

    def __init__(self) -> None:
        self._settings = get_settings()

    async def stream(
        self,
        messages: List[ChatMessage],
        model: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> AsyncGenerator[str, None]:
        api_key = self._settings.openrouter_api_key
        if not api_key:
            raise AuthError(self.name)

        # OpenRouter uses the full model string (e.g. "openai/gpt-4o")
        or_model = model.replace("openrouter/", "")

        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages += [{"role": m.role.value, "content": m.content} for m in messages]

        body: dict = {
            "model": or_model,
            "messages": payload_messages,
            "stream": True,
            "temperature": temperature,
        }
        if max_tokens:
            body["max_tokens"] = max_tokens

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self._settings.openrouter_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://voyage-ai.app",
                    "X-Title": "Voyage AI / GenSpark",
                },
                json=body,
            ) as resp:
                if resp.status_code == 429:
                    raise RateLimitError(self.name)
                if resp.status_code in (401, 403):
                    raise AuthError(self.name)
                if not resp.is_success:
                    text = await resp.aread()
                    raise ProviderError(
                        f"OpenRouter error {resp.status_code}: {text[:200]}",
                        resp.status_code,
                        self.name,
                    )
                async for line in resp.aiter_lines():
                    if not line or line.startswith(":"):
                        continue
                    if not line.startswith("data: "):
                        continue
                    raw = line[6:].strip()
                    if raw == "[DONE]":
                        yield self.sse_done()
                        return
                    yield f"data: {raw}\n\n"

        yield self.sse_done()

    async def health_check(self) -> bool:
        return bool(self._settings.openrouter_api_key)
