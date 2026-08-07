# ──────────────────────────────────────────────────────────────────────────────
# backend/app/middleware.py
# CORS, request logging, and rate-limiting middleware
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import logging
import time
from collections import defaultdict
from typing import Callable, Dict

from fastapi import Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

# ── CORS configuration (call configure_cors(app) from main.py) ────────────────

SUPABASE_HEADERS = [
    "authorization",
    "x-client-info",
    "apikey",
    "content-type",
    "x-supabase-client-platform",
    "x-supabase-client-platform-version",
    "x-supabase-client-runtime",
    "x-supabase-client-runtime-version",
]


def configure_cors(app, origins: list[str] | None = None) -> None:
    """Attach CORSMiddleware to the FastAPI app with Supabase-compatible headers."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Type", "Cache-Control", "X-Accel-Buffering"],
    )


# ── Request Logging Middleware ─────────────────────────────────────────────────

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs each request with method, path, status, and duration."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            f"{request.method} {request.url.path} → {response.status_code} "
            f"[{duration_ms:.1f}ms] ip={request.client.host if request.client else 'unknown'}"
        )
        return response


# ── Token-Bucket Rate Limiter Middleware ──────────────────────────────────────

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple per-IP token-bucket rate limiter.
    Default: 60 requests/minute per IP.
    Enable with: app.add_middleware(RateLimitMiddleware, rpm=60)
    """

    def __init__(self, app: ASGIApp, rpm: int = 60) -> None:
        super().__init__(app)
        self._rpm = rpm
        self._window = 60.0
        self._buckets: Dict[str, list] = defaultdict(list)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - self._window

        # Purge old timestamps
        self._buckets[client_ip] = [t for t in self._buckets[client_ip] if t > window_start]

        if len(self._buckets[client_ip]) >= self._rpm:
            return Response(
                content='{"error":"Rate limit exceeded. Please slow down."}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": "60"},
            )

        self._buckets[client_ip].append(now)
        return await call_next(request)
