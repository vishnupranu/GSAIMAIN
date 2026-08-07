# ──────────────────────────────────────────────────────────────────────────────
# backend/app/routers/webhooks.py
# Async webhook controllers: chat, code, image, dashboard
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import ast
import hashlib
import logging
import time
import uuid
from collections import defaultdict
from typing import Any, Dict

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel

from ..models import (
    DashboardStats,
    WebhookChatPayload,
    WebhookCodePayload,
    WebhookDashboardPayload,
    WebhookImagePayload,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])

# ── In-memory telemetry store (replace with Redis/Postgres in production) ─────
_STATS: Dict[str, Any] = defaultdict(int)
_STATS["start_time"] = time.time()
_IMAGE_QUEUE: Dict[str, Dict] = {}
_SESSION_STORE: Dict[str, Dict] = {}


# ── Background task helpers ───────────────────────────────────────────────────

async def _log_token_consumption(payload: WebhookChatPayload) -> None:
    """Persist token usage metrics asynchronously."""
    _STATS["total_requests"] += 1
    _STATS["total_tokens"] += payload.total_tokens
    _STATS[f"provider_{payload.model.split('/')[0]}"] += 1
    logger.info(
        f"[webhook/chat] conv={payload.conversation_id} "
        f"tokens={payload.total_tokens} model={payload.model}"
    )


async def _process_image_job(job_id: str, prompt: str) -> None:
    """Placeholder for async image generation processing."""
    _IMAGE_QUEUE[job_id]["status"] = "processing"
    logger.info(f"[webhook/image] Processing job {job_id}: {prompt[:60]}")
    # In production: enqueue to Celery / ARQ / Cloud Tasks
    await _simulate_async_work(0.1)
    _IMAGE_QUEUE[job_id]["status"] = "completed"


async def _simulate_async_work(delay: float) -> None:
    import asyncio
    await asyncio.sleep(delay)


def _parse_python_ast(code: str) -> Dict[str, Any]:
    """Parse Python code and return AST summary."""
    try:
        tree = ast.parse(code)
        return {
            "valid": True,
            "node_count": len(list(ast.walk(tree))),
            "functions": [
                n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)
            ],
            "classes": [
                n.name for n in ast.walk(tree) if isinstance(n, ast.ClassDef)
            ],
            "imports": [
                ast.unparse(n)
                for n in ast.walk(tree)
                if isinstance(n, (ast.Import, ast.ImportFrom))
            ],
        }
    except SyntaxError as e:
        return {"valid": False, "error": str(e), "line": e.lineno}


# ── Webhook: Chat ─────────────────────────────────────────────────────────────

@router.post(
    "/chat",
    summary="Chat telemetry webhook",
    description="Logs token consumption, conversation metadata, and streaming metrics.",
)
async def webhook_chat(
    payload: WebhookChatPayload,
    background_tasks: BackgroundTasks,
):
    """
    Called after each chat completion to record token usage and conversation state.
    Fire-and-forget telemetry via BackgroundTasks.
    """
    background_tasks.add_task(_log_token_consumption, payload)

    # Track active session
    _SESSION_STORE[payload.conversation_id] = {
        "user_id": payload.user_id,
        "model": payload.model,
        "last_active": time.time(),
        "total_tokens": payload.total_tokens,
    }

    return {
        "status": "accepted",
        "conversation_id": payload.conversation_id,
        "tokens_recorded": payload.total_tokens,
    }


# ── Webhook: Code ─────────────────────────────────────────────────────────────

@router.post(
    "/code",
    summary="Code processing webhook",
    description="AST parsing, syntax validation, and formatting for code generation outputs.",
)
async def webhook_code(payload: WebhookCodePayload):
    """
    Processes generated code — parses AST, validates syntax, and returns metadata.

    **Actions:**
    - `parse_ast` — Returns AST node summary
    - `validate` — Checks for syntax errors only
    - `format` — Placeholder for Black/Prettier formatting
    - `lint` — Placeholder for flake8/eslint integration
    """
    result: Dict[str, Any] = {
        "session_id": payload.session_id,
        "language": payload.language,
        "action": payload.action,
        "processed_at": time.time(),
    }

    if payload.language == "python":
        if payload.action in ("parse_ast", "validate"):
            result["ast"] = _parse_python_ast(payload.code)
        elif payload.action == "format":
            # Attempt autopep8 / black if available
            try:
                import autopep8  # type: ignore
                result["formatted_code"] = autopep8.fix_code(payload.code)
                result["was_modified"] = result["formatted_code"] != payload.code
            except ImportError:
                result["formatted_code"] = payload.code
                result["note"] = "autopep8 not installed; install it for auto-formatting"
        elif payload.action == "lint":
            # Basic Python lint via compile()
            try:
                compile(payload.code, "<string>", "exec")
                result["lint_errors"] = []
                result["valid"] = True
            except SyntaxError as e:
                result["lint_errors"] = [{"line": e.lineno, "message": str(e.msg)}]
                result["valid"] = False
    else:
        # Non-Python: pass-through with metadata
        result["note"] = f"Full AST parsing not yet implemented for '{payload.language}'"
        result["char_count"] = len(payload.code)
        result["line_count"] = payload.code.count("\n") + 1

    logger.info(f"[webhook/code] session={payload.session_id} action={payload.action} lang={payload.language}")
    return result


# ── Webhook: Image ────────────────────────────────────────────────────────────

@router.post(
    "/image",
    summary="Image generation queue webhook",
    description="Manages async image generation jobs, status updates, and cloud storage URLs.",
)
async def webhook_image(
    payload: WebhookImagePayload,
    background_tasks: BackgroundTasks,
):
    """
    Handles image generation job lifecycle events.
    - On `queued` → stores job, triggers background processing
    - On `completed` → records storage URL
    - On `failed` → records error metadata
    """
    job_id = payload.job_id

    if payload.status == "queued":
        _IMAGE_QUEUE[job_id] = {
            "prompt": payload.prompt,
            "status": "queued",
            "created_at": time.time(),
        }
        background_tasks.add_task(_process_image_job, job_id, payload.prompt)
        _STATS["images_queued"] += 1
        return {"status": "queued", "job_id": job_id, "message": "Processing started"}

    elif payload.status == "completed":
        if job_id in _IMAGE_QUEUE:
            _IMAGE_QUEUE[job_id]["status"] = "completed"
            _IMAGE_QUEUE[job_id]["image_url"] = payload.image_url
            _IMAGE_QUEUE[job_id]["storage_path"] = payload.storage_path
            _IMAGE_QUEUE[job_id]["completed_at"] = time.time()
        _STATS["images_completed"] += 1
        logger.info(f"[webhook/image] Job {job_id} completed → {payload.storage_path}")
        return {"status": "completed", "job_id": job_id, "image_url": payload.image_url}

    elif payload.status == "failed":
        if job_id in _IMAGE_QUEUE:
            _IMAGE_QUEUE[job_id]["status"] = "failed"
        _STATS["images_failed"] += 1
        logger.warning(f"[webhook/image] Job {job_id} failed")
        return {"status": "failed", "job_id": job_id}

    else:
        raise HTTPException(status_code=400, detail=f"Unknown status: {payload.status}")


@router.get(
    "/image/{job_id}",
    summary="Poll image job status",
)
async def get_image_job_status(job_id: str):
    """Poll the status of an async image generation job."""
    if job_id not in _IMAGE_QUEUE:
        raise HTTPException(status_code=404, detail="Job not found")
    return _IMAGE_QUEUE[job_id]


# ── Webhook: Dashboard ────────────────────────────────────────────────────────

@router.post(
    "/dashboard",
    summary="Dashboard event webhook",
    description="Records user events for real-time stats and conversation sync callbacks.",
)
async def webhook_dashboard(payload: WebhookDashboardPayload):
    """
    Receives user activity events and updates in-memory stats.

    **Events:**
    - `conversation_created` — New chat started
    - `message_sent` — User sent a message
    - `image_generated` — Image successfully generated
    - `code_generated` — Code generation completed
    - `session_ended` — User session closed
    """
    event = payload.event
    _STATS[f"event_{event}"] += 1

    logger.info(f"[webhook/dashboard] user={payload.user_id} event={event}")

    return {
        "status": "recorded",
        "user_id": payload.user_id,
        "event": event,
        "cumulative_count": _STATS[f"event_{event}"],
    }


@router.get(
    "/dashboard/stats",
    response_model=DashboardStats,
    summary="System metrics and aggregated dashboard stats",
)
async def get_dashboard_stats():
    """Returns aggregated system metrics and provider usage breakdown."""
    uptime = time.time() - _STATS["start_time"]
    provider_breakdown = {
        key.replace("provider_", ""): val
        for key, val in _STATS.items()
        if key.startswith("provider_")
    }
    active_sessions = sum(
        1
        for s in _SESSION_STORE.values()
        if time.time() - s.get("last_active", 0) < 300
    )

    return DashboardStats(
        total_requests=int(_STATS["total_requests"]),
        total_tokens=int(_STATS["total_tokens"]),
        active_sessions=active_sessions,
        provider_breakdown={k: int(v) for k, v in provider_breakdown.items()},
        uptime_seconds=uptime,
    )
