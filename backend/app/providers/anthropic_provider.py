# ──────────────────────────────────────────────────────────────────────────────
# backend/app/providers/anthropic_provider.py
# Anthropic Claude SDK streaming provider
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

from typing import AsyncGenerator, List, Optional

from .base import AuthError, LLMProvider, ProviderError, RateLimitError
from ..config import get_settings
from ..models import ChatMessage


class AnthropicProvider(LLMProvider):
    name = "anthropic"

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
            import anthropic
        except ImportError:
            raise ProviderError("anthropic package not installed. Run: pip install anthropic", provider=self.name)

        api_key = self._settings.anthropic_api_key
        if not api_key:
            raise AuthError(self.name)

        # Strip provider prefix: "anthropic/claude-3-5-sonnet" → "claude-3-5-sonnet"
        claude_model = model.replace("anthropic/", "")

        # Build messages list (Anthropic SDK expects user/assistant alternating)
        build_messages = []
        for m in messages:
            role = m.role.value
            if role in ("user", "assistant"):
                build_messages.append({"role": role, "content": m.content})
            # Skip system messages — they go in the system param

        if not build_messages:
            raise ProviderError("No messages to send", provider=self.name)

        client = anthropic.AsyncAnthropic(api_key=api_key)

        kwargs: dict = {
            "model": claude_model,
            "messages": build_messages,
            "max_tokens": max_tokens or 8192,
            "temperature": temperature,
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        try:
            async with client.messages.stream(**kwargs) as stream:
                async for text in stream.text_stream:
                    yield self.build_sse_chunk(text)

        except anthropic.RateLimitError:
            raise RateLimitError(self.name)
        except anthropic.AuthenticationError:
            raise AuthError(self.name)
        except anthropic.APIStatusError as exc:
            raise ProviderError(f"Anthropic API error {exc.status_code}: {exc.message}", provider=self.name)
        except Exception as exc:
            raise ProviderError(str(exc), provider=self.name)

        yield self.sse_done()

    async def health_check(self) -> bool:
        return bool(self._settings.anthropic_api_key)
