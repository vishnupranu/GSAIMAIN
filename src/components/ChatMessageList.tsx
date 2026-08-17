import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, User, Copy, Check, Volume2, RotateCcw, Lightbulb, Code2, Presentation, FileSpreadsheet } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { toast } from "sonner";
import type { Msg } from "@/lib/api";
import { speakText } from "@/lib/api";

interface ChatMessageListProps {
  messages: Msg[];
  isLoading: boolean;
  onSelectPrompt?: (text: string) => void;
  onRegenerate?: () => void;
}

const STARTER_PROMPTS = [
  { icon: Code2, title: "Full-Stack Web Sandbox", prompt: "Build an interactive glassmorphic Pomodoro Timer with sound notifications in a single HTML/CSS/JS file." },
  { icon: Presentation, title: "Strategic Pitch Deck", prompt: "Create a 5-slide investor pitch deck outlining a B2B AI Autonomous Workspace with unit economics." },
  { icon: FileSpreadsheet, title: "SaaS Financial Model", prompt: "Build a multi-column SaaS financial forecast table with ARR, NRR, CAC, and Gross Margin metrics." },
  { icon: Lightbulb, title: "Deep Market Analysis", prompt: "Analyze the top generative AI agent architectures for 2026 and compare local-first vs cloud multi-agent workflows." },
];

const ChatMessageList = ({ messages, isLoading, onSelectPrompt, onRegenerate }: ChatMessageListProps) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  const copyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success("Message copied to clipboard!");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleSpeak = (text: string, idx: number) => {
    setSpeakingIdx(idx);
    speakText(text);
    toast.info("Speaking response...");
    setTimeout(() => setSpeakingIdx(null), 4000);
  };

  if (messages.length === 0) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-primary-foreground mb-4 shadow-md">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-foreground font-heading">GUIDESOFT Autonomous Intelligence</h2>
        <p className="mt-1 text-xs text-muted-foreground max-w-md">
          Start a multi-turn conversation, trigger creative studios, or select a starter prompt below.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
          {STARTER_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt?.(item.prompt)}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md group"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-foreground group-hover:bg-foreground group-hover:text-primary-foreground transition-colors">
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground font-heading">{item.title}</h4>
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{item.prompt}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

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
              <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-foreground text-primary-foreground">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            )}
            <div
              className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-foreground text-primary-foreground"
                  : "bg-card border border-border text-foreground shadow-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-3 [&_code]:text-xs leading-relaxed">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}

              {msg.role === "assistant" && msg.content && (
                <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-1.5 justify-end">
                  <button
                    onClick={() => handleSpeak(msg.content, i)}
                    title="Read Aloud"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Volume2 className={`h-3.5 w-3.5 ${speakingIdx === i ? "text-primary animate-pulse" : ""}`} />
                  </button>

                  <button
                    onClick={() => copyMessage(msg.content, i)}
                    title="Copy Message"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {copiedIdx === i ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {i === messages.length - 1 && onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      title="Regenerate Response"
                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
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
          <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-foreground text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5 rounded-2xl bg-card border border-border px-4 py-3 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessageList;
