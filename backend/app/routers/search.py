# ──────────────────────────────────────────────────────────────────────────────
# backend/app/routers/search.py
# Web research endpoint — SSE-streamed AI research response
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import logging
from datetime import date

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ..models import ChatMessage, Role, SearchRequest
from ..routers.chat import _stream_with_fallback, CORS_HEADERS
from ..models import ChatRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/search", tags=["Web Search"])

WEB_RESEARCH_SYSTEM = """You are a research assistant with comprehensive knowledge. 
The user is asking you to search and research the following topic. 
Provide comprehensive, well-structured information with sources and citations where possible. 
Use markdown formatting with headers, bullet points, and code blocks where relevant.
If you're not sure about specific current data, say so clearly and provide what you know.

Current date: {date}"""


@router.post(
    "",
    summary="Stream web research response",
    description=(
        "Returns an SSE-streamed research synthesis using the best available model. "
        "Compatible with the existing frontend web-search Supabase Edge Function."
    ),
)
async def web_search(request: SearchRequest):
    logger.info(f"[search] query={request.query[:80]}")

    system_prompt = WEB_RESEARCH_SYSTEM.format(date=date.today().isoformat())

    # Build messages: optional history + research query
    messages = list(request.messages or [])
    messages.append(
        ChatMessage(
            role=Role.user,
            content=f"Research this topic thoroughly: {request.query}",
        )
    )

    chat_request = ChatRequest(
        messages=messages,
        model=request.model,
        system_prompt=system_prompt,
        stream=True,
    )

    return StreamingResponse(
        _stream_with_fallback(chat_request),
        media_type="text/event-stream",
        headers=CORS_HEADERS,
    )
