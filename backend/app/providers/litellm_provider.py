# ──────────────────────────────────────────────────────────────────────────────
# backend/app/providers/litellm_provider.py
# LiteLLM proxy — OpenAI-compatible, routes to 100+ models
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

from typing import AsyncGenerator, List, Optional

import httpx

from .base import LLMProvider, ProviderError, RateLimitError
from ..config import get_settings
from ..models import ChatMessage


class LiteLLMProvider(LLMProvider):
    name = "litellm"

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
        base_url = self._settings.litellm_base_url
        api_key = self._settings.litellm_api_key

        litellm_model = model.replace("litellm/", "")

        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages += [{"role": m.role.value, "content": m.content} for m in messages]

        body: dict = {
            "model": litellm_model,
            "messages": payload_messages,
            "stream": True,
            "temperature": temperature,
        }
        if max_tokens:
            body["max_tokens"] = max_tokens

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=body,
                ) as resp:
                    if resp.status_code == 429:
                        raise RateLimitError(self.name)
                    if not resp.is_success:
                        text = await resp.aread()
                        raise ProviderError(
                            f"LiteLLM error {resp.status_code}: {text[:200]}",
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
        except httpx.ConnectError:
            raise ProviderError(
                "LiteLLM proxy is not running. Start it with: litellm --model ollama/llama3",
                503,
                self.name,
            )

        yield self.sse_done()

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    self._settings.litellm_base_url.replace("/v1", "/health")
                )
                return resp.is_success
        except Exception:
            return False
