// ─────────────────────────────────────────────────────────────────────────────
// src/lib/api.ts
// Central API client — all AI calls go to our local FastAPI backend
// ─────────────────────────────────────────────────────────────────────────────

// In dev: use relative paths so Vite proxy forwards /api → localhost:8000 (no CORS)
// In prod: set VITE_FASTAPI_URL to your deployed backend URL
const BASE_URL =
  (import.meta.env.VITE_FASTAPI_URL as string | undefined) &&
  (import.meta.env.VITE_FASTAPI_URL as string) !== "http://localhost:8000"
    ? (import.meta.env.VITE_FASTAPI_URL as string)
    : "";  // empty string = relative URLs → proxy handles it

export const API = {
  chat: `${BASE_URL}/api/v1/chat`,
  image: `${BASE_URL}/api/v1/image/generate`,
  search: `${BASE_URL}/api/v1/search`,
  agentRun: `${BASE_URL}/api/v1/agent/run`,
  agentTools: `${BASE_URL}/api/v1/agent/tools`,
  models: `${BASE_URL}/api/v1/chat/models`,
  providers: `${BASE_URL}/api/v1/providers`,
  health: `${BASE_URL}/health`,
  stats: `${BASE_URL}/api/v1/stats`,
  paymentWebhook: `${BASE_URL}/api/v1/webhooks/payment`,
};

// ── Types ────────────────────────────────────────────────────────────────────

export type Msg = { role: "user" | "assistant"; content: string };

export interface ModelInfo {
  id: string;
  label?: string;
  provider: string;
  speed?: string;
}

export interface ImageResult {
  image_url?: string;
  job_id?: string;
  status: string;
  error?: string;
}

export interface ProviderStatus {
  providers: Record<string, boolean>;
  fallback_map: Record<string, string[]>;
}

export interface BackendStats {
  total_chat_requests: number;
  total_image_requests: number;
  total_search_requests: number;
  requests_by_provider: Record<string, number>;
  requests_by_model: Record<string, number>;
  uptime_seconds: number;
}

// ── Stream Chat (SSE) ────────────────────────────────────────────────────────

export async function streamChat({
  messages,
  model = "google/gemini-3-flash-preview",
  systemPrompt,
  onDelta,
  onDone,
  signal,
}: {
  messages: Msg[];
  model?: string;
  systemPrompt?: string;
  onDelta: (delta: string) => void;
  onDone: () => void;
  signal?: AbortSignal;
}) {
  const resp = await fetch(API.chat, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      model,
      systemPrompt,
    }),
    signal,
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || data.detail || `Request failed (${resp.status})`);
  }

  if (!resp.body) throw new Error("No response body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        // Handle error events from backend
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch (e: any) {
        if (e.message && !e.message.includes("JSON")) throw e;
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  onDone();
}

// ── Generate Image ───────────────────────────────────────────────────────────

export async function generateImage({
  prompt,
  model = "google/gemini-3-pro-image-preview",
  size = "1024x1024",
}: {
  prompt: string;
  model?: string;
  size?: string;
}): Promise<ImageResult> {
  const resp = await fetch(API.image, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model, size }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.detail || data.error || `Image generation failed (${resp.status})`);
  }

  return resp.json();
}

// ── Web Search (SSE) ─────────────────────────────────────────────────────────

export async function streamSearch({
  query,
  model = "google/gemini-2.5-flash",
  onDelta,
  onDone,
  signal,
}: {
  query: string;
  model?: string;
  onDelta: (delta: string) => void;
  onDone: () => void;
  signal?: AbortSignal;
}) {
  const resp = await fetch(API.search, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, model }),
    signal,
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.detail || data.error || `Search failed (${resp.status})`);
  }

  if (!resp.body) throw new Error("No response body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;

  while (!done) {
    const { done: rd, value } = await reader.read();
    if (rd) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(raw);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore partial */ }
    }
  }

  onDone();
}

// ── Fetch available models ────────────────────────────────────────────────────

export async function fetchModels(): Promise<ModelInfo[]> {
  try {
    const resp = await fetch(API.models);
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.models || []).map((m: any) => ({
      id: m.id,
      label: m.label || m.id.split("/")[1] || m.id,
      provider: m.provider,
      speed: m.speed,
    }));
  } catch {
    return [];
  }
}

// ── Fetch provider status ────────────────────────────────────────────────────

export async function fetchProviders(): Promise<ProviderStatus | null> {
  try {
    const resp = await fetch(API.providers);
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}

// ── Fetch backend stats ───────────────────────────────────────────────────────

export async function fetchStats(): Promise<BackendStats | null> {
  try {
    const resp = await fetch(API.stats);
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}

// ── Health check ─────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<boolean> {
  try {
    const resp = await fetch(API.health, { signal: AbortSignal.timeout(3000) });
    return resp.ok;
  } catch {
    return false;
  }
}
