# ──────────────────────────────────────────────────────────────────────────────
# backend/app/providers/ollama_provider.py
# Local Ollama REST API streaming provider
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

from typing import AsyncGenerator, List, Optional

import httpx

from .base import LLMProvider, ProviderError
from ..config import get_settings
from ..models import ChatMessage


class OllamaProvider(LLMProvider):
    name = "ollama"

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
        base_url = self._settings.ollama_base_url  # e.g. http://localhost:11434/v1

        # Strip "ollama/" prefix if present; fall back to llama3.2
        ollama_model = model.replace("ollama/", "") or "llama3.2"

        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages += [{"role": m.role.value, "content": m.content} for m in messages]

        body: dict = {
            "model": ollama_model,
            "messages": payload_messages,
            "stream": True,
            "options": {"temperature": temperature},
        }
        if max_tokens:
            body["options"]["num_predict"] = max_tokens

        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                async with client.stream(
                    "POST",
                    f"{base_url}/chat/completions",
                    json=body,
                ) as resp:
                    if not resp.is_success:
                        text = await resp.aread()
                        raise ProviderError(
                            f"Ollama error {resp.status_code}: {text[:200]}",
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
                "Ollama is not running. Start it with: ollama serve",
                503,
                self.name,
            )

        yield self.sse_done()

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    self._settings.ollama_base_url.replace("/v1", "/api/tags")
                )
                return resp.is_success
        except Exception:
            return False
