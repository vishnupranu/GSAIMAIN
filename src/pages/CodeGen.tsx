import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Code2, Play, Copy, Check, Loader2, Download,
  Eye, Terminal, Sparkles, RefreshCw, FileCode2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { streamChat } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import ModelSelector from "@/components/ModelSelector";
import type { ModelId } from "@/components/ModelSelector";
import { incrementCodeCount } from "@/hooks/useConversations";

const CODE_SYSTEM = `You are an expert full-stack developer.
When the user describes what they want, generate complete, production-ready, clean code.
If the user asks for a web app, game, or interactive component, provide the complete self-contained HTML/CSS/JavaScript in a single \`\`\`html fenced block so it can be previewed directly in an iframe.
Always provide clean code with zero placeholders or missing sections.`;

const TEMPLATES = [
  "Build a playable 2D Retro Arcade Web Game in HTML/CSS/JS",
  "Create an Interactive Glassmorphic Calculator with History Log",
  "Build a Python FastAPI CRUD Backend with SQLite & JWT Auth",
  "Design a Modern SaaS Pricing Matrix with Currency Converter",
  "Build a Canvas-based Particle Animation & Physics Sandbox"
];

const CodeGen = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [prompt, setPrompt] = useState(initialQuery);
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    if (!prompt.trim() || isLoading) return;
    setResult("");
    setIsLoading(true);
    setActiveTab("code");
    const controller = new AbortController();
    abortRef.current = controller;

    let soFar = "";
    try {
      await streamChat({
        messages: [{ role: "user", content: prompt }],
        model,
        systemPrompt: CODE_SYSTEM,
        onDelta: (chunk) => {
          soFar += chunk;
          setResult(soFar);
        },
        onDone: () => {
          setIsLoading(false);
          incrementCodeCount();
          toast.success("Code generation completed!");
        },
        signal: controller.signal,
      });
    } catch (e: any) {
      if (e.name === "AbortError") return;
      setIsLoading(false);
      toast.error(e.message || "Generation failed");
    }
  };

  // Auto-generate if started with ?q= param
  useEffect(() => {
    if (initialQuery) {
      generate();
    }
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleDownload = () => {
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(prompt || "code").slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Code downloaded!");
  };

  // Extract runnable HTML for the live sandbox
  const extractHTML = () => {
    const htmlMatch = result.match(/```html\s*([\s\S]*?)```/i);
    if (htmlMatch) return htmlMatch[1];
    if (result.includes("<html") || result.includes("<!DOCTYPE") || result.includes("<canvas")) {
      return result.replace(/```[a-z]*\s*/gi, "").replace(/```/g, "");
    }
    return null;
  };

  const previewHTML = extractHTML();

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
        {/* Top Header */}
        <div className="border-b border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-primary-foreground">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">AI Developer Studio</h1>
                <p className="text-[11px] text-muted-foreground">Full-stack software engineering, architecture, and live sandboxed web execution</p>
              </div>
            </div>

            {result && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyCode} className="h-8 gap-1.5 text-xs">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy Code
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) generate(); }}
              placeholder="Describe what you want to build (e.g. Super Mario Web Game, FastAPI Auth Backend)..."
              className="flex-1 min-w-[280px] h-9 text-xs"
            />
            <div className="w-48">
              <ModelSelector value={model} onChange={setModel} disabled={isLoading} />
            </div>

            {isLoading ? (
              <Button variant="outline" size="sm" onClick={() => abortRef.current?.abort()} className="h-9 text-xs">
                Stop
              </Button>
            ) : (
              <Button onClick={generate} disabled={!prompt.trim() || isLoading} className="h-9 gap-1.5 text-xs">
                <Play className="h-3.5 w-3.5" /> Compile Code
              </Button>
            )}
          </div>

          {/* Quick templates */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase flex-shrink-0">Ideas:</span>
            {TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onClick={() => setPrompt(tpl)}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex-shrink-0"
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>

        {/* Code Viewport & Sandbox */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden bg-muted/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === "code" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("code")}
                className="h-8 text-xs gap-1.5"
              >
                <FileCode2 className="h-3.5 w-3.5" /> Source Code
              </Button>
              {previewHTML && (
                <Button
                  variant={activeTab === "preview" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("preview")}
                  className="h-8 text-xs gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" /> Live Sandbox Preview
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card shadow-sm p-6">
            {activeTab === "code" ? (
              <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-4 [&_code]:text-xs">
                <ReactMarkdown>{result || "_Awaiting code instructions..._"}</ReactMarkdown>
              </div>
            ) : previewHTML ? (
              <iframe
                title="Live Sandbox Preview"
                srcDoc={previewHTML}
                sandbox="allow-scripts allow-modals"
                className="w-full h-full min-h-[500px] rounded-xl border border-border bg-white"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                No runnable HTML detected in output.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CodeGen;
