# ──────────────────────────────────────────────────────────────────────────────
# backend/app/providers/gemini_provider.py
# Google Gemini SDK streaming provider
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

from typing import AsyncGenerator, List, Optional

from .base import AuthError, LLMProvider, ProviderError, RateLimitError
from ..config import get_settings
from ..models import ChatMessage


class GeminiProvider(LLMProvider):
    name = "gemini"

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
            import google.generativeai as genai
        except ImportError:
            raise ProviderError("google-generativeai not installed", provider=self.name)

        api_key = self._settings.google_api_key
        if not api_key:
            raise AuthError(self.name)

        genai.configure(api_key=api_key)

        # Map model ID: "google/gemini-2.5-flash" → "gemini-2.5-flash"
        gemini_model_name = model.replace("google/", "")

        generation_config = genai.GenerationConfig(temperature=temperature)
        if max_tokens:
            generation_config.max_output_tokens = max_tokens

        client = genai.GenerativeModel(
            model_name=gemini_model_name,
            system_instruction=system_prompt or None,
            generation_config=generation_config,
        )

        # Build Gemini conversation history
        history = []
        last_user_message = None
        for msg in messages:
            if msg.role.value == "user":
                last_user_message = msg.content
                history.append({"role": "user", "parts": [msg.content]})
            elif msg.role.value == "assistant":
                history.append({"role": "model", "parts": [msg.content]})

        # Remove last user message from history — it becomes the actual send
        if history and history[-1]["role"] == "user":
            send_content = history.pop()["parts"][0]
        else:
            send_content = last_user_message or ""

        chat = client.start_chat(history=history)

        try:
            response = await chat.send_message_async(send_content, stream=True)
            async for chunk in response:
                if chunk.text:
                    yield self.build_sse_chunk(chunk.text)
        except Exception as exc:
            err_str = str(exc).lower()
            if "quota" in err_str or "rate" in err_str:
                raise RateLimitError(self.name)
            if "api key" in err_str or "invalid" in err_str:
                raise AuthError(self.name)
            raise ProviderError(str(exc), provider=self.name)

        yield self.sse_done()

    async def health_check(self) -> bool:
        return bool(self._settings.google_api_key)
