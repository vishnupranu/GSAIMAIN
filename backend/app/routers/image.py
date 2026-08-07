# ──────────────────────────────────────────────────────────────────────────────
# backend/app/routers/image.py
# Image generation endpoint using Lovable gateway / Gemini image model
# ──────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import logging
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


@router.post(
    "/generate",
    response_model=ImageResponse,
    summary="Generate an image from a text prompt",
    description=(
        "Sends a prompt to the Gemini image generation model via the Lovable gateway. "
        "Returns a base64 data URL or job ID for async processing."
    ),
)
async def generate_image(request: ImageRequest):
    settings = get_settings()
    api_key = settings.lovable_api_key

    if not api_key:
        raise HTTPException(status_code=500, detail="LOVABLE_API_KEY not configured")

    job_id = str(uuid.uuid4())
    logger.info(f"[image] job={job_id} prompt={request.prompt[:80]}")

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(
                f"{settings.lovable_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
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
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail=f"Image service unreachable: {exc}")

    if resp.status_code == 429:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
    if resp.status_code == 402:
        raise HTTPException(status_code=402, detail="Usage limit reached. Please add credits.")
    if not resp.is_success:
        logger.error(f"[image] gateway error {resp.status_code}: {resp.text[:200]}")
        raise HTTPException(status_code=502, detail="Image generation service temporarily unavailable.")

    try:
        data = resp.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Invalid response from image service")

    # Try inline base64 data (Gemini image model format)
    parts = data.get("choices", [{}])[0].get("message", {}).get("parts", [])
    inline = next((p.get("inline_data") for p in parts if p.get("inline_data")), None)

    if inline:
        image_url = f"data:{inline['mime_type']};base64,{inline['data']}"
        return ImageResponse(image_url=image_url, job_id=job_id, status="completed")

    # Fallback: check for a URL in content
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    if content and (content.startswith("http") or content.startswith("data:")):
        return ImageResponse(image_url=content, job_id=job_id, status="completed")

    # Model returned text instead of image
    logger.warning(f"[image] No image data in response: {content[:200]}")
    return ImageResponse(
        job_id=job_id,
        status="failed",
        error="Could not generate image. Try a more descriptive prompt.",
    )


@router.get(
    "/status/{job_id}",
    summary="Check image job status (async polling)",
)
async def image_job_status(job_id: str):
    """
    Placeholder for async image job status polling.
    In production, connect to the image job queue managed by webhooks router.
    """
    return {"job_id": job_id, "status": "unknown", "note": "Use webhook /image/{job_id} for full status"}
