# ──────────────────────────────────────────────────────────────────────────────
# backend/app/providers/openai_provider.py
# OpenAI SDK streaming provider
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

from typing import AsyncGenerator, List, Optional

from .base import AuthError, LLMProvider, ProviderError, RateLimitError
from ..config import get_settings
from ..models import ChatMessage


class OpenAIProvider(LLMProvider):
    name = "openai"

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
        try:
            from openai import AsyncOpenAI, AuthenticationError, RateLimitError as OAIRateLimit
        except ImportError:
            raise ProviderError("openai package not installed", provider=self.name)

        api_key = self._settings.openai_api_key
        if not api_key:
            raise AuthError(self.name)

        client = AsyncOpenAI(api_key=api_key, base_url=self._settings.openai_base_url)

        # Strip provider prefix from model name
        oai_model = model.replace("openai/", "")

        build_messages = []
        if system_prompt:
            build_messages.append({"role": "system", "content": system_prompt})
        build_messages += [{"role": m.role.value, "content": m.content} for m in messages]

        kwargs: dict = {"model": oai_model, "messages": build_messages, "stream": True, "temperature": temperature}
        if max_tokens:
            kwargs["max_tokens"] = max_tokens

        try:
            async with await client.chat.completions.create(**kwargs) as stream:
                async for chunk in stream:
                    delta = chunk.choices[0].delta if chunk.choices else None
                    if delta and delta.content:
                        yield self.build_sse_chunk(delta.content)
        except OAIRateLimit:
            raise RateLimitError(self.name)
        except AuthenticationError:
            raise AuthError(self.name)
        except Exception as exc:
            raise ProviderError(str(exc), provider=self.name)

        yield self.sse_done()

    async def health_check(self) -> bool:
        return bool(self._settings.openai_api_key)
