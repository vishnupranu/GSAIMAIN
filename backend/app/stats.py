# ──────────────────────────────────────────────────────────────────────────────
# backend/app/stats.py
# In-memory stats store — tracks request counts per provider/model
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock
from typing import Dict


class StatsStore:
    """Thread-safe in-memory counters for API usage tracking."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._start_time = time.time()
        self._chat_requests = 0
        self._image_requests = 0
        self._search_requests = 0
        self._by_provider: Dict[str, int] = defaultdict(int)
        self._by_model: Dict[str, int] = defaultdict(int)

    def increment_chat(self, provider: str = "unknown", model: str = "unknown") -> None:
        with self._lock:
            self._chat_requests += 1
            self._by_provider[provider] += 1
            self._by_model[model] += 1

    def increment_image(self, provider: str = "image") -> None:
        with self._lock:
            self._image_requests += 1
            self._by_provider[provider] += 1

    def increment_search(self, provider: str = "search") -> None:
        with self._lock:
            self._search_requests += 1
            self._by_provider[provider] += 1

    def to_dict(self) -> dict:
        with self._lock:
            return {
                "total_chat_requests": self._chat_requests,
                "total_image_requests": self._image_requests,
                "total_search_requests": self._search_requests,
                "requests_by_provider": dict(self._by_provider),
                "requests_by_model": dict(self._by_model),
                "uptime_seconds": round(time.time() - self._start_time, 2),
            }


# Global singleton
stats_store = StatsStore()
