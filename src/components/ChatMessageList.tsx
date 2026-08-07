import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, User, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import type { Msg } from "@/lib/streamChat";

interface ChatMessageListProps {
  messages: Msg[];
  isLoading: boolean;
}

const ChatMessageList = ({ messages, isLoading }: ChatMessageListProps) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <AnimatePresence>
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
          >
            {msg.role === "assistant" && (
              <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
            <div
              className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-foreground text-primary-foreground"
                  : "bg-card border border-border"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_code]:text-xs">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              {msg.role === "assistant" && msg.content && (
                <button
                  onClick={() => copyMessage(msg.content, i)}
                  className="absolute -bottom-3 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-card border border-border opacity-0 transition-opacity group-hover:opacity-100"
                >
                  {copiedIdx === i ? (
                    <Check className="h-3 w-3 text-tool-green" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
            {msg.role === "user" && (
              <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-accent">
                <User className="h-3.5 w-3.5 text-foreground" />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
        <div className="flex gap-3">
          <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground animate-pulse" />
          </div>
          <div className="flex items-center gap-1 rounded-2xl bg-card border border-border px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessageList;
