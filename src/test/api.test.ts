import { describe, it, expect } from "vitest";
import { API } from "@/lib/api";
import { STATIC_MODELS } from "@/components/ModelSelector";

describe("GUIDESOFT Central API Client", () => {
  it("should have correct endpoint URL patterns", () => {
    expect(API.chat).toContain("/api/v1/chat");
    expect(API.image).toContain("/api/v1/image");
    expect(API.models).toContain("/api/v1/chat/models");
    expect(API.stats).toContain("/api/v1/stats");
    expect(API.providers).toContain("/api/v1/providers");
    expect(API.paymentWebhook).toContain("/api/v1/webhooks/payment");
  });

  it("should provide comprehensive static fallback models across 7 providers", () => {
    expect(STATIC_MODELS.length).toBeGreaterThanOrEqual(25);

    const providers = new Set(STATIC_MODELS.map((m) => m.provider));
    expect(providers.has("Google")).toBe(true);
    expect(providers.has("OpenAI")).toBe(true);
    expect(providers.has("Anthropic")).toBe(true);
    expect(providers.has("Ollama (Local)")).toBe(true);
    expect(providers.has("OpenRouter")).toBe(true);
    expect(providers.has("HuggingFace")).toBe(true);
    expect(providers.has("LiteLLM")).toBe(true);
  });
});
