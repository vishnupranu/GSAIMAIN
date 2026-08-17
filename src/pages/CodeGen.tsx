import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Code2, Play, Copy, Check, Download,
  Eye, Terminal, Sparkles, RefreshCw, FileCode2, Mic, MicOff, Maximize2, Minimize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { streamChat, startVoiceRecognition } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import ModelSelector from "@/components/ModelSelector";
import type { ModelId } from "@/components/ModelSelector";
import { incrementCodeCount } from "@/hooks/useConversations";

const CODE_SYSTEM = `You are an expert full-stack developer.
When the user describes what they want, generate complete, production-ready, clean code.
If the user asks for a web app, game, or interactive component, provide the complete self-contained HTML/CSS/JavaScript in a single \`\`\`html fenced block so it can be previewed directly in an iframe.
Always provide clean code with zero placeholders or missing sections.`;

const TEMPLATES = [
  { label: "🕹️ Retro Arcade Game", prompt: "Build a playable 2D Retro Arcade Web Game with keyboard controls in a single HTML/CSS/JS file." },
  { label: "🧮 Glass Calculator", prompt: "Create an interactive glassmorphic calculator with calculation history log in HTML/CSS/JS." },
  { label: "⚡ FastAPI Backend", prompt: "Build a Python FastAPI CRUD Backend with SQLite, JWT Auth, and pydantic models." },
  { label: "📊 SaaS Pricing Matrix", prompt: "Design a modern SaaS pricing table with monthly/annual currency toggle in responsive HTML/CSS." },
  { label: "✨ Particle Physics", prompt: "Build a canvas-based particle attraction physics sandbox with mouse gravity in HTML/CSS/JS." },
];

const LANGUAGES = ["HTML / Web App", "Python", "TypeScript", "React JSX", "SQL", "Rust"];

const CodeGen = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [prompt, setPrompt] = useState(initialQuery);
  const [selectedLang, setSelectedLang] = useState("HTML / Web App");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [isListening, setIsListening] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const voiceControllerRef = useRef<{ stop: () => void } | null>(null);

  const generateWithPrompt = async (targetPrompt: string) => {
    if (!targetPrompt.trim() || isLoading) return;
    setResult("");
    setIsLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    let soFar = "";
    try {
      await streamChat({
        messages: [{ role: "user", content: `Target Language: ${selectedLang}\n\nTask: ${targetPrompt}` }],
        model,
        systemPrompt: CODE_SYSTEM,
        onDelta: (chunk) => {
          soFar += chunk;
          setResult(soFar);
        },
        onDone: () => {
          setIsLoading(false);
          incrementCodeCount();
          toast.success("Code compiled successfully!");
          // If HTML output generated, switch to preview automatically
          if (soFar.includes("```html") || soFar.includes("<!DOCTYPE") || soFar.includes("<html")) {
            setActiveTab("preview");
          }
        },
        signal: controller.signal,
      });
    } catch (e: any) {
      if (e.name === "AbortError") return;
      setIsLoading(false);
      toast.error(e.message || "Compilation failed");
    }
  };

  const handleRun = () => {
    generateWithPrompt(prompt);
  };

  const handleTemplateClick = (tplPrompt: string) => {
    setPrompt(tplPrompt);
    generateWithPrompt(tplPrompt);
  };

  // Auto-generate if started with ?q= param
  useEffect(() => {
    if (initialQuery) {
      generateWithPrompt(initialQuery);
    }
  }, []);

  const toggleVoice = () => {
    if (isListening) {
      voiceControllerRef.current?.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    toast.info("Listening... Speak your coding requirements.");

    const controller = startVoiceRecognition({
      onResult: (transcript) => {
        setPrompt(transcript);
      },
      onError: (err) => {
        toast.error(`Voice error: ${err}`);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    if (controller) {
      voiceControllerRef.current = controller;
    } else {
      setIsListening(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied to clipboard!");
  };

  const handleDownload = () => {
    const ext = selectedLang === "Python" ? "py" : selectedLang === "Rust" ? "rs" : selectedLang === "SQL" ? "sql" : "html";
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guidesoft_code_${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("File downloaded!");
  };

  // Extract runnable HTML for the live sandbox
  const extractHTML = () => {
    if (!result) return null;
    const htmlMatch = result.match(/```html\s*([\s\S]*?)```/i);
    if (htmlMatch) return htmlMatch[1];
    if (result.includes("<html") || result.includes("<!DOCTYPE") || result.includes("<canvas") || result.includes("<div")) {
      return result.replace(/```[a-z]*\s*/gi, "").replace(/```/g, "");
    }
    return null;
  };

  const previewHTML = extractHTML();

  return (
    <AppLayout>
      <div className={`flex flex-col overflow-hidden ${isFullscreen ? "fixed inset-0 z-50 bg-background" : "h-[calc(100vh-3.5rem)]"}`}>
        {/* Top Header */}
        <div className="border-b border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-primary-foreground">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground font-heading">AI Developer Studio</h1>
                <p className="text-[11px] text-muted-foreground">Full-stack software engineering, architecture, and live sandboxed web execution</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="h-8 rounded-xl border border-border bg-background px-2.5 text-xs text-foreground font-medium"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>

              {result && (
                <>
                  <Button variant="outline" size="sm" onClick={copyCode} className="h-8 gap-1.5 text-xs rounded-xl">
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />} Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 gap-1.5 text-xs rounded-xl">
                    <Download className="h-3.5 w-3.5" /> Export
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8 rounded-xl"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px]">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRun(); }}
                placeholder="Describe what you want to build (e.g. Super Mario Web Game, Glassmorphic Calculator, FastAPI Auth Backend)..."
                className="h-9 text-xs pr-9 rounded-xl"
              />
              <button
                type="button"
                onClick={toggleVoice}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${
                  isListening ? "text-red-500 animate-pulse" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Voice Dictation"
              >
                {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="w-48">
              <ModelSelector value={model} onChange={setModel} disabled={isLoading} />
            </div>

            {isLoading ? (
              <Button variant="outline" size="sm" onClick={() => abortRef.current?.abort()} className="h-9 text-xs rounded-xl text-red-500">
                Stop
              </Button>
            ) : (
              <Button onClick={handleRun} disabled={!prompt.trim() || isLoading} className="h-9 gap-1.5 text-xs rounded-xl">
                <Play className="h-3.5 w-3.5" /> Compile Code
              </Button>
            )}
          </div>

          {/* Quick interactive templates */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase flex-shrink-0">Starter Templates:</span>
            {TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onClick={() => handleTemplateClick(tpl.prompt)}
                className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all flex-shrink-0"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Code Viewport & Sandbox */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden bg-muted/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === "code" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("code")}
                className="h-8 text-xs gap-1.5 rounded-xl"
              >
                <FileCode2 className="h-3.5 w-3.5" /> Source Code
              </Button>
              {previewHTML && (
                <Button
                  variant={activeTab === "preview" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("preview")}
                  className="h-8 text-xs gap-1.5 rounded-xl"
                >
                  <Eye className="h-3.5 w-3.5" /> Live Sandbox Preview
                </Button>
              )}
            </div>

            {activeTab === "preview" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const frame = document.querySelector("iframe");
                  if (frame) frame.srcdoc = previewHTML || "";
                  toast.success("Sandbox reloaded!");
                }}
                className="h-7 text-[11px] gap-1 rounded-lg"
              >
                <RefreshCw className="h-3 w-3" /> Reload Frame
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-6">
            {activeTab === "code" ? (
              <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-4 [&_code]:text-xs">
                <ReactMarkdown>{result || "_Enter a prompt above or click a starter template to compile full-stack code and preview in the sandbox._"}</ReactMarkdown>
              </div>
            ) : previewHTML ? (
              <iframe
                title="Live Sandbox Preview"
                srcDoc={previewHTML}
                sandbox="allow-scripts allow-modals"
                className="w-full h-full min-h-[500px] rounded-xl border border-border bg-white"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-2">
                <p>No runnable HTML detected in current output.</p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("code")}>
                  View Source Code
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CodeGen;
