# ──────────────────────────────────────────────────────────────────────────────
# backend/app/routers/chat.py
# Multi-provider SSE streaming chat router with graceful fallback chain
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import asyncio
import logging
from typing import AsyncGenerator, List

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from ..config import get_settings
from ..models import ChatRequest
from ..providers.base import AuthError, LLMProvider, ProviderError, RateLimitError
from ..providers.gemini_provider import GeminiProvider
from ..providers.huggingface_provider import HuggingFaceProvider
from ..providers.litellm_provider import LiteLLMProvider
from ..providers.lovable_provider import LovableProvider
from ..providers.ollama_provider import OllamaProvider
from ..providers.openai_provider import OpenAIProvider
from ..providers.openrouter_provider import OpenRouterProvider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])

# ── Provider Registry ─────────────────────────────────────────────────────────

PROVIDER_MAP: dict[str, LLMProvider] = {
    "gemini": GeminiProvider(),
    "openai": OpenAIProvider(),
    "lovable": LovableProvider(),
    "ollama": OllamaProvider(),
    "openrouter": OpenRouterProvider(),
    "litellm": LiteLLMProvider(),
    "huggingface": HuggingFaceProvider(),
}

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": (
        "authorization, x-client-info, apikey, content-type, "
        "x-supabase-client-platform, x-supabase-client-platform-version"
    ),
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
}


def _resolve_provider_chain(model: str) -> List[LLMProvider]:
    """
    Determine the ordered fallback chain of providers for a given model ID.
    e.g. "google/gemini-3-flash-preview" → [GeminiProvider, LovableProvider, OllamaProvider]
    """
    settings = get_settings()
    prefix = model.split("/")[0].lower()
    chain_names: List[str] = settings.provider_fallback_map.get(
        prefix, settings.provider_fallback_map["default"]
    )
    return [PROVIDER_MAP[n] for n in chain_names if n in PROVIDER_MAP]


async def _stream_with_fallback(request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Try each provider in the fallback chain. If the primary provider raises
    RateLimitError or AuthError, fall back to the next in the chain.
    Always fall back to Lovable (if key exists) or Ollama as last resort.
    """
    chain = _resolve_provider_chain(request.model)

    # Ensure Lovable and Ollama are always at the end of the chain as ultimate fallbacks
    for fallback_name in ("lovable", "ollama"):
        fallback = PROVIDER_MAP[fallback_name]
        if fallback not in chain:
            chain.append(fallback)

    last_error: Exception | None = None

    for provider in chain:
        try:
            logger.info(f"Trying provider '{provider.name}' for model '{request.model}'")
            async for chunk in provider.stream(
                messages=request.messages,
                model=request.model,
                system_prompt=request.system_prompt,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            ):
                yield chunk
            return  # Success — stop trying other providers

        except (RateLimitError, AuthError) as exc:
            logger.warning(
                f"Provider '{provider.name}' unavailable ({exc}). "
                f"Falling back to next provider..."
            )
            last_error = exc
            continue

        except ProviderError as exc:
            logger.error(f"Provider '{provider.name}' hard error: {exc}")
            last_error = exc
            continue

        except asyncio.CancelledError:
            # Client disconnected — stop gracefully
            logger.info("Client disconnected, aborting stream")
            return

    # All providers failed
    if last_error:
        error_msg = str(last_error)
    else:
        error_msg = "All AI providers are currently unavailable. Please try again later."

    yield f'data: {{"error": "{error_msg}"}}\n\n'
    yield "data: [DONE]\n\n"


# ── Routes ────────────────────────────────────────────────────────────────────

@router.options("")
@router.options("/")
async def chat_options():
    """Handle preflight CORS requests."""
    from fastapi.responses import Response
    return Response(headers=CORS_HEADERS)


@router.post(
    "",
    summary="Stream chat completions",
    description=(
        "SSE streaming endpoint that routes to the optimal LLM provider "
        "based on the model prefix. Supports automatic fallback chains."
    ),
    response_description="Server-Sent Events stream in OpenAI chat completion format",
)
async def chat_stream(request: ChatRequest, http_request: Request):
    """
    Multi-provider streaming chat endpoint.

    **Model routing:**
    - `google/*` → Gemini SDK → Lovable gateway → OpenRouter
    - `openai/*` → OpenAI SDK → OpenRouter → Lovable gateway
    - `ollama/*` → Local Ollama
    - `litellm/*` → LiteLLM proxy
    - `openrouter/*` → OpenRouter directly
    - `huggingface/*` → HuggingFace Inference API
    - Anything else → Lovable gateway → Ollama
    """
    logger.info(f"Chat request: model={request.model}, messages={len(request.messages)}")

    return StreamingResponse(
        _stream_with_fallback(request),
        media_type="text/event-stream",
        headers=CORS_HEADERS,
    )


@router.get(
    "/models",
    summary="List supported models",
)
async def list_models():
    """Returns all model IDs supported by the frontend ModelSelector."""
    return {
        "models": [
            {"id": "google/gemini-3-flash-preview", "provider": "Google", "speed": "Fast"},
            {"id": "google/gemini-2.5-flash", "provider": "Google", "speed": "Fast"},
            {"id": "google/gemini-2.5-pro", "provider": "Google", "speed": "Slow"},
            {"id": "google/gemini-3.1-pro-preview", "provider": "Google", "speed": "Medium"},
            {"id": "google/gemini-2.5-flash-lite", "provider": "Google", "speed": "Fastest"},
            {"id": "openai/gpt-5", "provider": "OpenAI", "speed": "Medium"},
            {"id": "openai/gpt-5-mini", "provider": "OpenAI", "speed": "Fast"},
            {"id": "openai/gpt-5-nano", "provider": "OpenAI", "speed": "Fastest"},
            {"id": "openai/gpt-5.2", "provider": "OpenAI", "speed": "Medium"},
            {"id": "ollama/llama3.2", "provider": "Ollama (Local)", "speed": "Fast"},
            {"id": "ollama/mistral", "provider": "Ollama (Local)", "speed": "Fast"},
            {"id": "litellm/gpt-4o", "provider": "LiteLLM", "speed": "Medium"},
        ]
    }
