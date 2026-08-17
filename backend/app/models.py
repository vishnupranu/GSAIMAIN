# ──────────────────────────────────────────────────────────────────────────────
# backend/app/models.py
# Shared Pydantic request / response models
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── LLM / Chat ───────────────────────────────────────────────────────────────

class Role(str, Enum):
    system = "system"
    user = "user"
    assistant = "assistant"
    tool = "tool"


class ChatMessage(BaseModel):
    role: Role
    content: str
    name: Optional[str] = None


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., min_length=1)
    model: str = Field(default="google/gemini-3-flash-preview")
    system_prompt: Optional[str] = Field(default=None, alias="systemPrompt")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, ge=1)
    stream: bool = True

    model_config = {"populate_by_name": True}


# ── Image Generation ─────────────────────────────────────────────────────────

class ImageRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    model: str = "google/gemini-3-pro-image-preview"
    size: str = "1024x1024"
    quality: str = "standard"


class ImageResponse(BaseModel):
    image_url: Optional[str] = None
    job_id: Optional[str] = None
    status: str = "completed"
    error: Optional[str] = None


# ── Web Search ───────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    messages: Optional[List[ChatMessage]] = None
    model: str = "google/gemini-2.5-flash"


# ── Webhooks ─────────────────────────────────────────────────────────────────

class WebhookChatPayload(BaseModel):
    conversation_id: str
    user_id: Optional[str] = None
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    duration_ms: Optional[int] = None
    metadata: Dict[str, Any] = {}


class WebhookCodePayload(BaseModel):
    session_id: str
    language: str = "python"
    code: str
    action: str = "format"  # format | lint | parse_ast | validate
    metadata: Dict[str, Any] = {}


class WebhookImagePayload(BaseModel):
    job_id: str
    prompt: str
    status: str  # queued | processing | completed | failed
    image_url: Optional[str] = None
    storage_path: Optional[str] = None
    metadata: Dict[str, Any] = {}


class WebhookDashboardPayload(BaseModel):
    user_id: str
    event: str  # conversation_created | message_sent | image_generated | etc.
    data: Dict[str, Any] = {}


class WebhookPaymentPayload(BaseModel):
    transaction_id: str
    plan_name: str
    amount: str
    period: str
    payment_method: str  # gpay | upi | card
    upi_id: Optional[str] = None
    user_id: Optional[str] = None
    timestamp: Optional[str] = None
    metadata: Dict[str, Any] = {}


# ── MCP Agent ────────────────────────────────────────────────────────────────

class AgentTool(BaseModel):
    name: str
    description: str
    parameters: Dict[str, Any] = {}
    requires_confirmation: bool = False


class AgentExecuteRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = {}
    session_id: Optional[str] = None


class AgentExecuteResponse(BaseModel):
    tool_name: str
    result: Any
    success: bool
    error: Optional[str] = None
    duration_ms: Optional[int] = None


class AgentRunRequest(BaseModel):
    task: str = Field(..., min_length=1)
    model: str = "google/gemini-3-flash-preview"
    max_steps: int = Field(default=10, ge=1, le=50)
    tools: Optional[List[str]] = None  # subset of tool names; None = all


class AgentRunResponse(BaseModel):
    task: str
    steps: List[Dict[str, Any]] = []
    final_answer: Optional[str] = None
    success: bool
    total_steps: int = 0


# ── Metrics / Health ─────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    providers: Dict[str, bool] = {}


class DashboardStats(BaseModel):
    total_requests: int = 0
    total_tokens: int = 0
    active_sessions: int = 0
    provider_breakdown: Dict[str, int] = {}
    uptime_seconds: float = 0.0
