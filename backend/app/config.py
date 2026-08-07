# ──────────────────────────────────────────────────────────────────────────────
# backend/app/config.py
# Centralised Pydantic Settings — reads from environment / .env file
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ───────────────────────────────────────────────────────────────────
    app_name: str = "Voyage AI / GenSpark Backend"
    app_version: str = "1.0.0"
    debug: bool = False
    log_level: str = "INFO"

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins: List[str] = Field(
        default=["*"],
        description="Allowed CORS origins",
    )

    # ── Lovable Gateway (primary fallback) ────────────────────────────────────
    lovable_api_key: str = Field(default="", alias="LOVABLE_API_KEY")
    lovable_base_url: str = "https://ai.gateway.lovable.dev/v1"

    # ── OpenAI ────────────────────────────────────────────────────────────────
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_base_url: str = "https://api.openai.com/v1"

    # ── Anthropic ────────────────────────────────────────────────────────────
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")

    # ── Google Gemini ────────────────────────────────────────────────────────
    google_api_key: str = Field(default="", alias="GOOGLE_API_KEY")

    # ── OpenRouter ───────────────────────────────────────────────────────────
    openrouter_api_key: str = Field(default="", alias="OPENROUTER_API_KEY")
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # ── HuggingFace ──────────────────────────────────────────────────────────
    huggingface_api_key: str = Field(default="", alias="HUGGINGFACE_API_KEY")
    huggingface_base_url: str = "https://api-inference.huggingface.co/v1"

    # ── Ollama (local) ───────────────────────────────────────────────────────
    ollama_base_url: str = Field(
        default="http://localhost:11434/v1", alias="OLLAMA_BASE_URL"
    )
    ollama_enabled: bool = True

    # ── LiteLLM ──────────────────────────────────────────────────────────────
    litellm_base_url: str = Field(
        default="http://localhost:4000/v1", alias="LITELLM_BASE_URL"
    )
    litellm_api_key: str = Field(default="sk-1234", alias="LITELLM_API_KEY")

    # ── Provider fallback order ───────────────────────────────────────────────
    # Keys are model prefix strings; values are ordered provider names.
    provider_fallback_map: dict = {
        "google": ["gemini", "lovable", "openrouter"],
        "openai": ["openai", "openrouter", "lovable"],
        "anthropic": ["anthropic", "openrouter"],
        "ollama": ["ollama"],
        "litellm": ["litellm"],
        "openrouter": ["openrouter"],
        "huggingface": ["huggingface"],
        "default": ["lovable", "ollama"],
    }

    # ── Rate limiting ────────────────────────────────────────────────────────
    rate_limit_requests_per_minute: int = 60
    rate_limit_enabled: bool = False  # Flip to True to enable

    # ── MCP Agent ────────────────────────────────────────────────────────────
    mcp_allow_shell: bool = False   # sandboxed by default
    mcp_allow_write: bool = False   # read-only by default
    mcp_max_steps: int = 10

    # ── Token / Stats store (in-memory; swap for Redis in prod) ──────────────
    stats_store_ttl_seconds: int = 3600


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
