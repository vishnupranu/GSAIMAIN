// ─────────────────────────────────────────────────────────────────────────────
// src/lib/streamChat.ts
// Re-exports streamChat from the central api.ts client for backwards compat.
// All new code should import directly from "@/lib/api".
// ─────────────────────────────────────────────────────────────────────────────
export type { Msg } from "./api";
export { streamChat } from "./api";
