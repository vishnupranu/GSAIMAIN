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

    try {
      await streamChat({
        messages: newMessages,
        model,
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

  const suggestions = [
    "Write a Python script to scrape news headlines",
    "Explain quantum computing in simple terms",
    "Create a React component for a todo list",
    "Help me plan a 7-day trip to Japan",
  ];

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
          <div className="flex items-center gap-1 px-2 py-1 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
            <span className="text-xs text-muted-foreground">
              {conversationId ? "Conversation" : "New Chat"}
            </span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground">
                    <Sparkles className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground">How can I help you today?</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ask anything — I can write, code, research, and create.
                  </p>
                </motion.div>
                <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                  {suggestions.map((s, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      onClick={() => sendMessage(s)}
                      className="rounded-xl border border-border bg-card p-3 text-left text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <ChatMessageList messages={messages} isLoading={isLoading} />
            )}
          </div>

          <ChatInput
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            model={model}
            setModel={setModel}
            onSubmit={handleSubmit}
            onStop={handleStop}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Chat;
