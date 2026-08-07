# ──────────────────────────────────────────────────────────────────────────────
# backend/main.py
# FastAPI Application Entry Point — Voyage AI / GenSpark Backend Engine
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import uvicorn
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.middleware import RequestLoggingMiddleware, RateLimitMiddleware, configure_cors
from app.models import HealthResponse
from app.routers import chat as chat_router
from app.routers import image as image_router
from app.routers import search as search_router
from app.routers import webhooks as webhooks_router
from app.mcp_agent import router as agent_router

# ── Logging configuration ─────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)
_START_TIME = time.time()

# ── Application Lifespan ──────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()
    logger.info(f"🚀 {settings.app_name} v{settings.app_version} starting up...")
    logger.info(f"   Lovable gateway: {'✓' if settings.lovable_api_key else '✗'}")
    logger.info(f"   OpenAI SDK:      {'✓' if settings.openai_api_key else '✗'}")
    logger.info(f"   Google Gemini:   {'✓' if settings.google_api_key else '✗'}")
    logger.info(f"   Anthropic:       {'✓' if settings.anthropic_api_key else '✗'}")
    logger.info(f"   OpenRouter:      {'✓' if settings.openrouter_api_key else '✗'}")
    logger.info(f"   Ollama:          {'✓' if settings.ollama_enabled else '✗'} ({settings.ollama_base_url})")
    logger.info(f"   MCP shell:       {'enabled' if settings.mcp_allow_shell else 'sandboxed'}")
    logger.info(f"   MCP write:       {'enabled' if settings.mcp_allow_write else 'read-only'}")
    logger.info("   OpenAPI docs:    http://localhost:8000/docs")
    yield
    logger.info("🛑 Shutting down...")


# ── FastAPI App ───────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="""
## Voyage AI / GenSpark Backend Engine

A centralized FastAPI backend that provides:

- **Multi-provider LLM streaming** (`/api/v1/chat`) with automatic fallback chains
- **Webhook controllers** (`/api/v1/webhooks/*`) for chat, code, image, and dashboard
- **Image generation** (`/api/v1/image/generate`) via Gemini image model
- **Web research** (`/api/v1/search`) with SSE streaming
- **MCP Agent** (`/api/v1/agent/*`) with tool execution and multi-step reasoning loop

### Provider Support
| Prefix | Providers |
|--------|-----------|
| `google/*` | Gemini SDK → Lovable gateway → OpenRouter |
| `openai/*` | OpenAI SDK → OpenRouter → Lovable gateway |
| `ollama/*` | Local Ollama (llama3.2, mistral, etc.) |
| `litellm/*` | LiteLLM proxy |
| `openrouter/*` | OpenRouter directly |
| `huggingface/*` | HuggingFace Inference API |
        """,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
        contact={"name": "GenSpark AI Team", "url": "https://genspark.ai"},
        license_info={"name": "MIT"},
    )

    # ── Middleware ─────────────────────────────────────────────────────────
    configure_cors(app, origins=settings.cors_origins)
    app.add_middleware(RequestLoggingMiddleware)
    if settings.rate_limit_enabled:
        app.add_middleware(RateLimitMiddleware, rpm=settings.rate_limit_requests_per_minute)

    # ── Routers ───────────────────────────────────────────────────────────
    app.include_router(chat_router.router)
    app.include_router(webhooks_router.router)
    app.include_router(image_router.router)
    app.include_router(search_router.router)
    app.include_router(agent_router)

    # ── Core Routes ───────────────────────────────────────────────────────

    @app.get("/health", response_model=HealthResponse, tags=["System"])
    async def health_check():
        """
        Health check endpoint. Returns provider availability and uptime.
        Use this for Docker health checks and monitoring.
        """
        from app.routers.chat import PROVIDER_MAP
        provider_status = {}
        for name, provider in PROVIDER_MAP.items():
            try:
                provider_status[name] = await provider.health_check()
            except Exception:
                provider_status[name] = False

        return HealthResponse(
            status="ok",
            version=settings.app_version,
            providers=provider_status,
        )

    @app.get("/", tags=["System"])
    async def root():
        """API root — redirect users to /docs."""
        return JSONResponse({
            "message": f"Welcome to {settings.app_name}",
            "version": settings.app_version,
            "docs": "/docs",
            "health": "/health",
            "uptime_seconds": round(time.time() - _START_TIME, 2),
        })

    @app.get("/api/v1/providers", tags=["System"])
    async def list_providers():
        """Returns configured provider status and fallback map."""
        return {
            "providers": {
                "lovable": bool(settings.lovable_api_key),
                "openai": bool(settings.openai_api_key),
                "gemini": bool(settings.google_api_key),
                "anthropic": bool(settings.anthropic_api_key),
                "openrouter": bool(settings.openrouter_api_key),
                "huggingface": bool(settings.huggingface_api_key),
                "ollama": settings.ollama_enabled,
                "litellm": True,  # always available if LiteLLM server is running
            },
            "fallback_map": settings.provider_fallback_map,
        }

    return app


# ── Application instance ──────────────────────────────────────────────────────
app = create_app()


# ── Dev server entrypoint ─────────────────────────────────────────────────────
if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
        access_log=False,  # Using custom middleware instead
    )
