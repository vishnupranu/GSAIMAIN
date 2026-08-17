// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useConversations.ts
// localStorage-based conversation persistence (no Supabase DB required)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "guidesoft_conversations";

function loadAll(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(conversations: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // Storage full — drop oldest
    const trimmed = conversations.slice(-50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    setConversations(loadAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }, []);

  const refresh = useCallback(() => {
    setConversations(loadAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }, []);

  const createConversation = useCallback((firstMessage: string, model: string): string => {
    const id = generateId();
    const now = new Date().toISOString();
    const title = firstMessage.slice(0, 80) || "New Chat";
    const conv: Conversation = {
      id,
      title,
      model,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    const all = [conv, ...loadAll()];
    saveAll(all);
    setConversations(all);
    return id;
  }, []);

  const appendMessage = useCallback(
    (id: string, role: "user" | "assistant", content: string) => {
      const all = loadAll();
      const idx = all.findIndex((c) => c.id === id);
      if (idx === -1) return;
      const msg: ConversationMessage = {
        role,
        content,
        createdAt: new Date().toISOString(),
      };
      all[idx].messages.push(msg);
      all[idx].updatedAt = new Date().toISOString();
      saveAll(all);
      setConversations([...all].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    },
    []
  );

  const getConversation = useCallback((id: string): Conversation | null => {
    return loadAll().find((c) => c.id === id) ?? null;
  }, []);

  const deleteConversation = useCallback((id: string) => {
    const all = loadAll().filter((c) => c.id !== id);
    saveAll(all);
    setConversations(all);
  }, []);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setConversations([]);
  }, []);

  const getStats = useCallback(() => {
    const all = loadAll();
    const totalMessages = all.reduce((s, c) => s + c.messages.length, 0);
    const imageCount = parseInt(localStorage.getItem("guidesoft_image_count") || "0", 10);
    const codeCount = parseInt(localStorage.getItem("guidesoft_code_count") || "0", 10);
    return {
      conversations: all.length,
      messages: totalMessages,
      imagesGenerated: imageCount,
      codeSessions: codeCount,
    };
  }, []);

  return {
    conversations,
    refresh,
    createConversation,
    appendMessage,
    getConversation,
    deleteConversation,
    clearAll,
    getStats,
  };
}

// ── Helper exports ────────────────────────────────────────────────────────────
export { loadAll as loadConversations, saveAll as saveConversations };

export function getLocalStorageStats() {
  const all = loadAll();
  const totalMessages = all.reduce((s, c) => s + c.messages.length, 0);
  const imageCount = parseInt(localStorage.getItem("guidesoft_image_count") || "0", 10);
  const codeCount = parseInt(localStorage.getItem("guidesoft_code_count") || "0", 10);
  return {
    conversations: all.length,
    messages: totalMessages,
    imagesGenerated: imageCount,
    codeSessions: codeCount,
  };
}

// ── Increment counters (call from pages) ──────────────────────────────────────
export function incrementImageCount() {
  const n = parseInt(localStorage.getItem("guidesoft_image_count") || "0", 10);
  localStorage.setItem("guidesoft_image_count", String(n + 1));
}

export function incrementCodeCount() {
  const n = parseInt(localStorage.getItem("guidesoft_code_count") || "0", 10);
  localStorage.setItem("guidesoft_code_count", String(n + 1));
}
