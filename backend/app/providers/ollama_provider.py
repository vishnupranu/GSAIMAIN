# ──────────────────────────────────────────────────────────────────────────────
# backend/app/providers/ollama_provider.py
# Local Ollama REST API streaming provider with smart model resolution
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import json
import logging
from typing import AsyncGenerator, List, Optional

import httpx

from .base import LLMProvider, ProviderError
from ..config import get_settings
from ..models import ChatMessage

logger = logging.getLogger(__name__)


class OllamaProvider(LLMProvider):
    name = "ollama"

    def __init__(self) -> None:
        self._settings = get_settings()
        self._model_cache: list[str] = []

    async def _list_models(self, base_url: str) -> list[str]:
        """Fetch available model names from Ollama."""
        if self._model_cache:
            return self._model_cache
        try:
            tags_url = base_url.replace("/v1", "") + "/api/tags"
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(tags_url)
                if resp.is_success:
                    data = resp.json()
                    names = [m["name"] for m in data.get("models", [])]
                    self._model_cache = names
                    return names
        except Exception:
            pass
        return []

    async def _resolve_model(self, requested: str, base_url: str) -> str:
        """
        Map requested model name to actual available Ollama model.
        e.g. "llama3.2" → "llama3.2:3b" or "llama3.2:latest"
        """
        available = await self._list_models(base_url)

        # Exact match first
        if requested in available:
            return requested

        # Try "name:latest" variant
        if f"{requested}:latest" in available:
            return f"{requested}:latest"

        # Prefix match (e.g. "llama3.2" matches "llama3.2:3b")
        for model in available:
            base_name = model.split(":")[0]
            if base_name == requested or base_name.startswith(requested):
                logger.info(f"Ollama: resolved '{requested}' → '{model}'")
                return model

        # Substring match (e.g. "llama3" matches "llama3.1:latest")
        for model in available:
            if requested in model:
                logger.info(f"Ollama: fuzzy resolved '{requested}' → '{model}'")
                return model

        # Fall back to first available model
        if available:
            logger.warning(
                f"Ollama: model '{requested}' not found; using first available: '{available[0]}'"
            )
            return available[0]

        # Nothing available
        raise ProviderError(
            f"No models available in Ollama. Run: ollama pull llama3.2",
            503,
            self.name,
        )

    async def stream(
        self,
        messages: List[ChatMessage],
        model: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> AsyncGenerator[str, None]:
        base_url = self._settings.ollama_base_url  # e.g. http://localhost:11434/v1

        # Strip "ollama/" prefix if present
        raw_model = model.replace("ollama/", "") or "llama3.2"

        # Resolve to actual available model name
        try:
            ollama_model = await self._resolve_model(raw_model, base_url)
        except ProviderError:
            raise
        except Exception as exc:
            raise ProviderError(str(exc), 503, self.name)

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

        logger.info(f"[ollama] streaming model='{ollama_model}'")

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
            base_url = self._settings.ollama_base_url
            tags_url = base_url.replace("/v1", "") + "/api/tags"
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(tags_url)
                return resp.is_success
        except Exception:
            return False
