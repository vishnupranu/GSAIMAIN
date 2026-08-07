import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, PanelLeftClose, PanelLeft } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { streamChat, type Msg } from "@/lib/streamChat";
import type { ModelId } from "@/components/ModelSelector";
import AppLayout from "@/components/AppLayout";
import ChatMessageList from "@/components/ChatMessageList";
import ChatInput from "@/components/ChatInput";
import ChatSidebar from "@/components/ChatSidebar";
import { Button } from "@/components/ui/button";

const Chat = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (initialQuery && !sentInitial.current) {
      sentInitial.current = true;
      sendMessage(initialQuery);
    }
  }, [initialQuery]);

  const createConversation = async (firstMsg: string): Promise<string | null> => {
    if (!userId) return null;
    const title = firstMsg.slice(0, 80) || "New Chat";
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, title, model })
      .select("id")
      .single();
    if (error) { console.error(error); return null; }
    return data.id;
  };

  const saveMessage = async (convId: string, role: string, content: string) => {
    await supabase.from("chat_messages").insert({ conversation_id: convId, role, content });
  };

  const loadConversation = async (id: string) => {
    setConversationId(id);
    const { data: conv } = await supabase.from("conversations").select("model").eq("id", id).single();
    if (conv?.model) setModel(conv.model as ModelId);

    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    setMessages((msgs || []).map((m) => ({ role: m.role as Msg["role"], content: m.content })));
  };

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setInput("");
  };

  const sendMessage = async (text: string) => {
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Persist
    let convId = conversationId;
    if (!convId && userId) {
      convId = await createConversation(text.trim());
      if (convId) setConversationId(convId);
    }
    if (convId) await saveMessage(convId, "user", text.trim());

    const controller = new AbortController();
    abortRef.current = controller;
    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: newMessages,
        model,
        onDelta: upsertAssistant,
        onDone: async () => {
          setIsLoading(false);
          if (convId && assistantSoFar) {
            await saveMessage(convId, "assistant", assistantSoFar);
            await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
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
            userId={userId}
          />
        )}

        {/* Main chat area */}
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-1 px-2 py-1 border-b border-border">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(!sidebarOpen)}>
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
                  <p className="mt-2 text-sm text-muted-foreground">Ask anything — I can write, code, research, and create.</p>
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
