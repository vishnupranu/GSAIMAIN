import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Code2, Play, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { streamChat } from "@/lib/streamChat";
import AppLayout from "@/components/AppLayout";
import ModelSelector from "@/components/ModelSelector";
import type { ModelId } from "@/components/ModelSelector";

const CODE_SYSTEM = `You are an expert code generator. When the user describes what they want, generate clean, production-ready code. Always use fenced code blocks with the language identifier. Include brief explanations. If the user asks for a full app, provide complete runnable code.`;

const CodeGen = () => {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    if (!prompt.trim() || isLoading) return;
    setResult("");
    setIsLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    let soFar = "";
    try {
      await streamChat({
        messages: [{ role: "user", content: prompt }],
        model,
        systemPrompt: CODE_SYSTEM,
        onDelta: (chunk) => { soFar += chunk; setResult(soFar); },
        onDone: () => setIsLoading(false),
        signal: controller.signal,
      });
    } catch (e: any) {
      if (e.name === "AbortError") return;
      setIsLoading(false);
      toast.error(e.message || "Generation failed");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const suggestions = [
    "Build a React todo app with local storage",
    "Python Flask REST API with CRUD operations",
    "Tailwind CSS landing page with dark mode",
    "TypeScript utility functions for date formatting",
  ];

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-4xl">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground">
                  <Code2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">AI Code Generator</h1>
                  <p className="text-xs text-muted-foreground">Describe what you want to build and get production-ready code</p>
                </div>
              </div>
            </motion.div>

            {/* Prompt area */}
            <div className="mb-4 rounded-2xl border border-border bg-card p-4 search-shadow">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the code you want to generate..."
                className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                rows={3}
                onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) generate(); }}
              />
              <div className="mt-3 flex items-center justify-between">
                <ModelSelector value={model} onChange={setModel} disabled={isLoading} />
                <div className="flex gap-2">
                  {isLoading && (
                    <Button variant="outline" size="sm" onClick={() => { abortRef.current?.abort(); setIsLoading(false); }}>
                      Stop
                    </Button>
                  )}
                  <Button size="sm" onClick={generate} disabled={!prompt.trim() || isLoading} className="gap-1.5">
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Generate
                  </Button>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            {!result && !isLoading && (
              <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {suggestions.map((s, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    onClick={() => { setPrompt(s); }}
                    className="rounded-xl border border-border bg-card p-3 text-left text-xs text-foreground transition-colors hover:bg-accent"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Result */}
            {(result || isLoading) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative rounded-2xl border border-border bg-card p-4">
                {result && (
                  <button
                    onClick={copyCode}
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background transition-colors hover:bg-accent"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-tool-green" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_code]:text-xs">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
                {isLoading && !result && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating code...
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CodeGen;
