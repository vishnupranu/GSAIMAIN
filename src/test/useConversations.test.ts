import { describe, it, expect, beforeEach } from "vitest";
import {
  loadConversations,
  saveConversations,
  getLocalStorageStats,
  incrementCodeCount,
  incrementImageCount,
  type Conversation,
} from "@/hooks/useConversations";

describe("GUIDESOFT LocalStorage Persistence Hook", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return empty list by default", () => {
    const convs = loadConversations();
    expect(convs).toEqual([]);
  });

  it("should save and load conversations", () => {
    const newConv: Conversation = {
      id: "conv_test_123",
      title: "Test Architecture Review",
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: "Hello world", createdAt: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveConversations([newConv]);

    const loaded = loadConversations();
    expect(loaded.length).toBe(1);
    expect(loaded[0].title).toBe("Test Architecture Review");
    expect(loaded[0].messages.length).toBe(1);
  });

  it("should increment and track code and image counters", () => {
    incrementCodeCount();
    incrementCodeCount();
    incrementImageCount();

    const stats = getLocalStorageStats();
    expect(stats.codeSessions).toBe(2);
    expect(stats.imagesGenerated).toBe(1);
  });
});
