# ──────────────────────────────────────────────────────────────────────────────
# backend/app/providers/lovable_provider.py
# Primary fallback — proxies through ai.gateway.lovable.dev
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import json
from typing import AsyncGenerator, List, Optional

import httpx

from .base import AuthError, LLMProvider, ProviderError, RateLimitError
from ..config import get_settings
from ..models import ChatMessage


class LovableProvider(LLMProvider):
    name = "lovable"

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
        api_key = self._settings.lovable_api_key
        if not api_key:
            raise AuthError(self.name)

        default_system = (
            "You are Genspark AI, a powerful and helpful AI assistant. "
            "Be concise, accurate, and helpful. Use markdown formatting for better readability. "
            "For code, always use fenced code blocks with language identifiers."
        )

        payload_messages = [
            {"role": "system", "content": system_prompt or default_system}
        ] + [{"role": m.role.value, "content": m.content} for m in messages]

        body: dict = {
            "model": model,
            "messages": payload_messages,
            "stream": True,
            "temperature": temperature,
        }
        if max_tokens:
            body["max_tokens"] = max_tokens

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self._settings.lovable_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
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
                        f"Lovable gateway error {resp.status_code}: {text[:200]}",
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
                    # Pass through as-is — already in OpenAI SSE format
                    yield f"data: {raw}\n\n"

        yield self.sse_done()

    async def health_check(self) -> bool:
        return bool(self._settings.lovable_api_key)
