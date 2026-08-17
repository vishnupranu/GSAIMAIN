import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Code2, Play, Copy, Check, Download,
  Eye, Terminal, Sparkles, RefreshCw, FileCode2, Mic, MicOff, Maximize2, Minimize2, Trash2
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

interface ConsoleLogItem {
  id: string;
  level: "log" | "warn" | "error";
  text: string;
  time: string;
}

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

const CONSOLE_INTERCEPT_SCRIPT = `
<script>
  (function() {
    function send(type, args) {
      try {
        var str = Array.prototype.slice.call(args).map(function(a) {
          if (typeof a === 'object') {
            try { return JSON.stringify(a); } catch(e) { return String(a); }
          }
          return String(a);
        }).join(' ');
        window.parent.postMessage({ type: 'SANDBOX_CONSOLE', level: type, text: str, time: new Date().toLocaleTimeString() }, '*');
      } catch(err) {}
    }
    var _log = console.log, _warn = console.warn, _err = console.error;
    console.log = function() { send('log', arguments); if (_log) _log.apply(console, arguments); };
    console.warn = function() { send('warn', arguments); if (_warn) _warn.apply(console, arguments); };
    console.error = function() { send('error', arguments); if (_err) _err.apply(console, arguments); };
    window.onerror = function(msg, url, line) { send('error', [msg + ' (line ' + line + ')']); };
  })();
</script>
`;

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
  const [showConsole, setShowConsole] = useState(true);
  const [logs, setLogs] = useState<ConsoleLogItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const voiceControllerRef = useRef<{ stop: () => void } | null>(null);

  // Listen for console logs from sandboxed iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "SANDBOX_CONSOLE") {
        setLogs((prev) => [
          ...prev.slice(-99),
          {
            id: Math.random().toString(36).slice(2),
            level: e.data.level || "log",
            text: e.data.text || "",
            time: e.data.time || new Date().toLocaleTimeString(),
          },
        ]);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const generateWithPrompt = async (targetPrompt: string) => {
    if (!targetPrompt.trim() || isLoading) return;
    setResult("");
    setLogs([]);
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
    toast.info("Listening... Describe the application you want to build.");

    const controller = startVoiceRecognition({
      onResult: (transcript) => {
        setPrompt(transcript);
      },
      onError: (err) => {
        toast.error(err);
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
    let code = "";
    const htmlMatch = result.match(/```html\s*([\s\S]*?)```/i);
    if (htmlMatch) {
      code = htmlMatch[1];
    } else if (result.includes("<html") || result.includes("<!DOCTYPE") || result.includes("<canvas") || result.includes("<div")) {
      code = result.replace(/```[a-z]*\s*/gi, "").replace(/```/g, "");
    } else {
      return null;
    }

    // Inject console capturing script into head or start of document
    if (code.includes("<head>")) {
      return code.replace("<head>", `<head>${CONSOLE_INTERCEPT_SCRIPT}`);
    }
    return `${CONSOLE_INTERCEPT_SCRIPT}${code}`;
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
                <p className="text-[11px] text-muted-foreground">Full-stack software engineering, architecture, live sandbox & runtime console</p>
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

            <Button
              onClick={handleRun}
              disabled={!prompt.trim() || isLoading}
              className="h-9 gap-1.5 text-xs rounded-xl shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" /> {isLoading ? "Compiling..." : "Compile Code"}
            </Button>
          </div>

          {/* Quick template triggers */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase flex-shrink-0">Starter Blueprints:</span>
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

        {/* Studio Viewport */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Sub-header Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === "code" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("code")}
                className="h-8 gap-1.5 text-xs rounded-xl"
              >
                <FileCode2 className="h-3.5 w-3.5" /> Code Editor
              </Button>
              {previewHTML && (
                <Button
                  variant={activeTab === "preview" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("preview")}
                  className="h-8 gap-1.5 text-xs rounded-xl"
                >
                  <Eye className="h-3.5 w-3.5" /> Live Sandbox
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={showConsole ? "default" : "outline"}
                size="sm"
                onClick={() => setShowConsole(!showConsole)}
                className="h-7 text-xs gap-1.5 rounded-lg"
              >
                <Terminal className="h-3 w-3" /> Console ({logs.length})
              </Button>
              {activeTab === "preview" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const iframe = document.getElementById("code-sandbox-iframe") as HTMLIFrameElement;
                    if (iframe) iframe.srcdoc = previewHTML || "";
                    setLogs([]);
                    toast.info("Sandbox reloaded.");
                  }}
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-3 w-3" /> Reload Sandbox
                </Button>
              )}
            </div>
          </div>

          {/* Main Area: Code or Iframe */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            <div className="flex-1 overflow-auto">
              {activeTab === "code" ? (
                <div className="h-full overflow-auto p-4 sm:p-6 bg-muted/10 font-mono text-xs">
                  {result ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-card [&_pre]:p-5 [&_pre]:border [&_pre]:border-border [&_code]:text-xs">
                      <ReactMarkdown>{result}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-8">
                      <Code2 className="h-12 w-12 mb-3 opacity-30 animate-pulse" />
                      <p className="text-sm font-medium text-foreground">AI Developer Engine Standby</p>
                      <p className="text-xs text-muted-foreground mt-1">Select a blueprint or enter a prompt to compile full-stack applications</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full w-full bg-white">
                  <iframe
                    id="code-sandbox-iframe"
                    srcDoc={previewHTML || ""}
                    title="Live Code Preview"
                    sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                    className="h-full w-full border-0"
                  />
                </div>
              )}
            </div>

            {/* Bottom Live Console Log Pane */}
            {showConsole && (
              <div className="h-44 border-t border-border bg-slate-950 flex flex-col flex-shrink-0">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-slate-900/80 text-[11px] font-mono">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Terminal className="h-3.5 w-3.5 text-primary" />
                    <span>RUNTIME CONSOLE OUTPUT</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setLogs([])}
                    className="h-5 px-2 text-[10px] text-slate-400 hover:text-white"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Clear
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
                  {logs.length === 0 ? (
                    <span className="text-slate-500 italic text-[11px] block p-1">Console is ready. Runtime logs and errors will stream here...</span>
                  ) : (
                    logs.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-2 px-1.5 py-0.5 rounded text-[11px] ${
                          item.level === "error"
                            ? "bg-red-500/10 text-red-400"
                            : item.level === "warn"
                            ? "bg-amber-500/10 text-amber-400"
                            : "text-slate-300 hover:bg-slate-900"
                        }`}
                      >
                        <span className="text-slate-500 text-[10px] select-none flex-shrink-0">{item.time}</span>
                        <span className={`font-bold uppercase text-[9px] px-1 rounded flex-shrink-0 ${
                          item.level === "error" ? "bg-red-900/50 text-red-300" : item.level === "warn" ? "bg-amber-900/50 text-amber-300" : "bg-slate-800 text-slate-400"
                        }`}>
                          {item.level}
                        </span>
                        <span className="break-all">{item.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CodeGen;
