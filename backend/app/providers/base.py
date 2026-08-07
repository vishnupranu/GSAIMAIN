# ──────────────────────────────────────────────────────────────────────────────
# backend/app/providers/base.py
# Abstract base class for all LLM streaming providers
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import abc
from typing import AsyncGenerator, List

from ..models import ChatMessage


class ProviderError(Exception):
    """Raised when a provider call fails irrecoverably."""

    def __init__(self, message: str, status_code: int = 500, provider: str = "unknown"):
        super().__init__(message)
        self.status_code = status_code
        self.provider = provider


class RateLimitError(ProviderError):
    def __init__(self, provider: str = "unknown"):
        super().__init__("Rate limit exceeded", 429, provider)


class AuthError(ProviderError):
    def __init__(self, provider: str = "unknown"):
        super().__init__("API key invalid or missing", 401, provider)


class LLMProvider(abc.ABC):
    """
    Abstract async streaming provider.

    Subclasses must implement `stream()` which yields raw SSE data lines
    in the OpenAI format:  ``data: {"choices":[{"delta":{"content":"..."}}]}``
    """

    name: str = "base"

    @abc.abstractmethod
    async def stream(
        self,
        messages: List[ChatMessage],
        model: str,
        system_prompt: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        Async generator that yields SSE-formatted data lines.
        Each yielded string should be the full SSE line, e.g.:
            'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'
        Must yield 'data: [DONE]\n\n' at the end.
        """
        ...

    async def health_check(self) -> bool:
        """Returns True if the provider is reachable."""
        return True

    @staticmethod
    def build_sse_chunk(content: str) -> str:
        """Wrap a content string in the OpenAI SSE chunk format."""
        import json
        payload = {
            "choices": [
                {"delta": {"content": content}, "finish_reason": None, "index": 0}
            ]
        }
        return f"data: {json.dumps(payload)}\n\n"

    @staticmethod
    def sse_done() -> str:
        return "data: [DONE]\n\n"
