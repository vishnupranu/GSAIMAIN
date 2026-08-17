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
from ..providers.anthropic_provider import AnthropicProvider
from ..stats import stats_store

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
    "anthropic": AnthropicProvider(),
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

    # Ensure Ollama (no API key needed) is tried before Lovable as ultimate fallback
    for fallback_name in ("ollama", "lovable"):
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
            # Track successful delivery
            stats_store.increment_chat(provider=provider.name, model=request.model)
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
    """Returns all model IDs supported across all providers."""
    return {
        "models": [
            # Google Gemini
            {"id": "google/gemini-3-flash-preview", "label": "Gemini 3 Flash", "provider": "Google", "speed": "Fast"},
            {"id": "google/gemini-2.5-flash", "label": "Gemini 2.5 Flash", "provider": "Google", "speed": "Fast"},
            {"id": "google/gemini-2.5-flash-lite", "label": "Gemini 2.5 Flash Lite", "provider": "Google", "speed": "Fastest"},
            {"id": "google/gemini-2.5-pro", "label": "Gemini 2.5 Pro", "provider": "Google", "speed": "Slow"},
            {"id": "google/gemini-3.1-pro-preview", "label": "Gemini 3.1 Pro", "provider": "Google", "speed": "Medium"},
            # OpenAI
            {"id": "openai/gpt-5", "label": "GPT-5", "provider": "OpenAI", "speed": "Medium"},
            {"id": "openai/gpt-5-mini", "label": "GPT-5 Mini", "provider": "OpenAI", "speed": "Fast"},
            {"id": "openai/gpt-5-nano", "label": "GPT-5 Nano", "provider": "OpenAI", "speed": "Fastest"},
            {"id": "openai/gpt-4o", "label": "GPT-4o", "provider": "OpenAI", "speed": "Fast"},
            {"id": "openai/gpt-4o-mini", "label": "GPT-4o Mini", "provider": "OpenAI", "speed": "Fastest"},
            # Anthropic
            {"id": "anthropic/claude-opus-4", "label": "Claude Opus 4", "provider": "Anthropic", "speed": "Slow"},
            {"id": "anthropic/claude-sonnet-4-5", "label": "Claude Sonnet 4.5", "provider": "Anthropic", "speed": "Medium"},
            {"id": "anthropic/claude-3-5-haiku", "label": "Claude 3.5 Haiku", "provider": "Anthropic", "speed": "Fast"},
            {"id": "anthropic/claude-3-5-sonnet", "label": "Claude 3.5 Sonnet", "provider": "Anthropic", "speed": "Medium"},
            # Ollama (Local)
            {"id": "ollama/llama3.2", "label": "Llama 3.2", "provider": "Ollama (Local)", "speed": "Fast"},
            {"id": "ollama/mistral", "label": "Mistral", "provider": "Ollama (Local)", "speed": "Fast"},
            {"id": "ollama/codellama", "label": "CodeLlama", "provider": "Ollama (Local)", "speed": "Medium"},
            {"id": "ollama/gemma3", "label": "Gemma 3", "provider": "Ollama (Local)", "speed": "Fast"},
            {"id": "ollama/phi4", "label": "Phi-4", "provider": "Ollama (Local)", "speed": "Fast"},
            # OpenRouter
            {"id": "openrouter/meta-llama/llama-3.3-70b-instruct", "label": "Llama 3.3 70B", "provider": "OpenRouter", "speed": "Fast"},
            {"id": "openrouter/mistralai/mistral-large", "label": "Mistral Large", "provider": "OpenRouter", "speed": "Medium"},
            {"id": "openrouter/deepseek/deepseek-chat", "label": "DeepSeek Chat", "provider": "OpenRouter", "speed": "Fast"},
            # HuggingFace
            {"id": "huggingface/meta-llama/Llama-3.1-8B-Instruct", "label": "Llama 3.1 8B", "provider": "HuggingFace", "speed": "Fast"},
            {"id": "huggingface/mistralai/Mistral-7B-Instruct-v0.3", "label": "Mistral 7B", "provider": "HuggingFace", "speed": "Fast"},
            # LiteLLM
            {"id": "litellm/gpt-4o", "label": "GPT-4o (LiteLLM)", "provider": "LiteLLM", "speed": "Fast"},
            {"id": "litellm/claude-3-5-sonnet", "label": "Claude 3.5 Sonnet (LiteLLM)", "provider": "LiteLLM", "speed": "Medium"},
        ]
    }

