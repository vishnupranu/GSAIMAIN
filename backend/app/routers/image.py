# ──────────────────────────────────────────────────────────────────────────────
# backend/app/routers/image.py
# Image generation endpoint — Lovable gateway → Gemini → SVG fallback
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import base64
import logging
import textwrap
import uuid
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException

from ..config import get_settings
from ..models import ImageRequest, ImageResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/image", tags=["Image Generation"])

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}


def _make_svg_placeholder(prompt: str, job_id: str) -> str:
    """
    Generate a descriptive SVG data URL as a zero-dependency fallback.
    The SVG displays the prompt text and a gradient background so the UI
    doesn't show a blank state when no image API key is configured.
    """
    # Wrap prompt text at ~40 chars per line, max 5 lines
    wrapped = textwrap.wrap(prompt[:200], width=40)[:5]
    lines_svg = "".join(
        f'<tspan x="512" dy="{36 if i else 0}">{line}</tspan>'
        for i, line in enumerate(wrapped)
    )

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1"/>
      <stop offset="50%" style="stop-color:#16213e;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#0f3460;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#e94560;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#533483;stop-opacity:1"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <!-- Decorative circles -->
  <circle cx="200" cy="200" r="150" fill="none" stroke="#e94560" stroke-width="1" opacity="0.2"/>
  <circle cx="824" cy="824" r="150" fill="none" stroke="#533483" stroke-width="1" opacity="0.2"/>
  <circle cx="512" cy="512" r="300" fill="none" stroke="url(#accent)" stroke-width="2" opacity="0.15"/>
  <!-- Icon placeholder -->
  <rect x="462" y="280" width="100" height="100" rx="20" fill="url(#accent)" opacity="0.8"/>
  <text x="512" y="350" font-family="sans-serif" font-size="50" fill="white" text-anchor="middle">🎨</text>
  <!-- Title -->
  <text x="512" y="460" font-family="sans-serif" font-size="20" fill="#aaa" text-anchor="middle">AI Generated Image</text>
  <!-- Prompt text -->
  <text x="512" y="530" font-family="sans-serif" font-size="22" fill="white" text-anchor="middle"
        font-style="italic" opacity="0.9">{lines_svg}</text>
  <!-- Footer note -->
  <text x="512" y="900" font-family="sans-serif" font-size="16" fill="#555" text-anchor="middle">
    Add an image API key to generate real images • GUIDESOFT
  </text>
  <text x="512" y="930" font-family="sans-serif" font-size="12" fill="#444" text-anchor="middle">
    Job: {job_id[:8]}
  </text>
</svg>"""

    encoded = base64.b64encode(svg.encode()).decode()
    return f"data:image/svg+xml;base64,{encoded}"


async def _try_lovable_image(request: ImageRequest, settings, job_id: str) -> Optional[str]:
    """Attempt image generation via Lovable gateway. Returns image_url or None."""
    if not settings.lovable_api_key:
        return None

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(
                f"{settings.lovable_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.lovable_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": request.model,
                    "messages": [
                        {
                            "role": "user",
                            "content": f"Generate an image based on this description: {request.prompt}",
                        }
                    ],
                },
            )
        except httpx.RequestError:
            return None

    if not resp.is_success:
        logger.warning(f"[image] Lovable gateway returned {resp.status_code}")
        return None

    try:
        data = resp.json()
    except Exception:
        return None

    # Try inline base64 data (Gemini image model format)
    parts = data.get("choices", [{}])[0].get("message", {}).get("parts", [])
    inline = next((p.get("inline_data") for p in parts if p.get("inline_data")), None)
    if inline:
        return f"data:{inline['mime_type']};base64,{inline['data']}"

    # Fallback: URL or data URI in content
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    if content and (content.startswith("http") or content.startswith("data:")):
        return content

    return None


async def _try_openai_image(request: ImageRequest, settings, job_id: str) -> Optional[str]:
    """Attempt image generation via OpenAI DALL-E. Returns image_url or None."""
    if not settings.openai_api_key:
        return None

    # Only run for dall-e models
    model_lower = request.model.lower()
    if "dall-e" not in model_lower and "openai" not in model_lower:
        return None

    dalle_model = request.model.replace("openai/", "") or "dall-e-3"

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.images.generate(
            model=dalle_model,
            prompt=request.prompt,
            size=request.size,  # type: ignore
            response_format="url",
            n=1,
        )
        url = response.data[0].url if response.data else None
        return url
    except Exception as exc:
        logger.warning(f"[image] OpenAI DALL-E error: {exc}")
        return None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post(
    "/generate",
    response_model=ImageResponse,
    summary="Generate an image from a text prompt",
    description=(
        "Attempts image generation via: "
        "1) Lovable/Gemini gateway (if LOVABLE_API_KEY set), "
        "2) OpenAI DALL-E (if OPENAI_API_KEY set and dall-e model selected), "
        "3) SVG placeholder fallback (always available, no API key required)."
    ),
)
async def generate_image(request: ImageRequest):
    settings = get_settings()
    job_id = str(uuid.uuid4())
    logger.info(f"[image] job={job_id} prompt={request.prompt[:80]}")

    # Increment local stats
    try:
        from ..stats import stats_store
        stats_store.increment_image()
    except Exception:
        pass

    # 1️⃣ Try Lovable/Gemini gateway
    image_url = await _try_lovable_image(request, settings, job_id)
    if image_url:
        return ImageResponse(image_url=image_url, job_id=job_id, status="completed")

    # 2️⃣ Try OpenAI DALL-E
    image_url = await _try_openai_image(request, settings, job_id)
    if image_url:
        return ImageResponse(image_url=image_url, job_id=job_id, status="completed")

    # 3️⃣ SVG placeholder fallback (always works, zero API dependency)
    logger.info(f"[image] No image API configured — returning SVG placeholder for job={job_id}")
    svg_url = _make_svg_placeholder(request.prompt, job_id)
    return ImageResponse(
        image_url=svg_url,
        job_id=job_id,
        status="completed",
        error=None,
    )


@router.get(
    "/status/{job_id}",
    summary="Check image job status (async polling)",
)
async def image_job_status(job_id: str):
    """
    Placeholder for async image job status polling.
    In production, connect to a job queue or Redis.
    """
    return {"job_id": job_id, "status": "unknown", "note": "Use /generate for synchronous generation"}
