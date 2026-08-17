import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, PanelLeftClose, PanelLeft } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { streamChat, type Msg } from "@/lib/api";
import type { ModelId } from "@/components/ModelSelector";
import AppLayout from "@/components/AppLayout";
import ChatMessageList from "@/components/ChatMessageList";
import ChatInput from "@/components/ChatInput";
import ChatSidebar from "@/components/ChatSidebar";
import { Button } from "@/components/ui/button";
import { useConversations } from "@/hooks/useConversations";

const Chat = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialConvId = searchParams.get("id") || null;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [conversationId, setConversationId] = useState<string | null>(initialConvId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  const { createConversation, appendMessage, getConversation, refresh } = useConversations();

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Load conversation from localStorage if ?id= param given
  useEffect(() => {
    if (initialConvId) {
      const conv = getConversation(initialConvId);
      if (conv) {
        setModel(conv.model as ModelId);
        setMessages(conv.messages.map((m) => ({ role: m.role, content: m.content })));
      }
    }
  }, [initialConvId]);

  // Auto-send initial query from ?q= param
  useEffect(() => {
    if (initialQuery && !sentInitial.current) {
      sentInitial.current = true;
      sendMessage(initialQuery);
    }
  }, [initialQuery]);

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setInput("");
  };

  const loadConversation = (id: string) => {
    const conv = getConversation(id);
    if (!conv) return;
    setConversationId(id);
    setModel(conv.model as ModelId);
    setMessages(conv.messages.map((m) => ({ role: m.role, content: m.content })));
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Msg = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Persist user message
    let convId = conversationId;
    if (!convId) {
      convId = createConversation(trimmed, model);
      setConversationId(convId);
    }
    appendMessage(convId, "user", trimmed);

    const controller = new AbortController();
    abortRef.current = controller;
    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    const systemPrompt = webSearchEnabled
      ? "You are GUIDESOFT AI with live web search intelligence. Synthesize answers with clear citations, recent facts, and objective analysis."
      : undefined;

    try {
      await streamChat({
        messages: newMessages,
        model,
        systemPrompt,
        onDelta: upsertAssistant,
        onDone: () => {
          setIsLoading(false);
          if (convId && assistantSoFar) {
            appendMessage(convId, "assistant", assistantSoFar);
            refresh();
          }
        },
        signal: controller.signal,
      });
    } catch (e: any) {
      if (e.name === "AbortError") return;
      setIsLoading(false);
      toast.error(e.message || "Failed to get response");
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
  };

  const handleRegenerate = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      // Remove last assistant message
      if (messages[messages.length - 1]?.role === "assistant") {
        setMessages((prev) => prev.slice(0, -1));
      }
      sendMessage(lastUser.content);
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        {sidebarOpen && (
          <ChatSidebar
            currentId={conversationId}
            onSelect={loadConversation}
            onNew={handleNewChat}
            userId={null}
          />
        )}

        {/* Main chat area */}
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/40">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
              >
                {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              </Button>
              <span className="text-xs font-semibold text-foreground">
                {conversationId ? "Active Conversation" : "New Chat Session"}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              className="h-7 text-xs rounded-lg"
            >
              + New Chat
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/5">
            <ChatMessageList
              messages={messages}
              isLoading={isLoading}
              onSelectPrompt={(text) => sendMessage(text)}
              onRegenerate={handleRegenerate}
            />
          </div>

          <ChatInput
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            model={model}
            setModel={setModel}
            onSubmit={handleSubmit}
            onStop={handleStop}
            webSearchEnabled={webSearchEnabled}
            onToggleWebSearch={() => setWebSearchEnabled((prev) => !prev)}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Chat;
