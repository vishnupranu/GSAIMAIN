import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Swords, Sparkles, Send, RotateCcw, Copy, Check,
  Zap, Clock, DollarSign, Trophy, ArrowRight, Mic, MicOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { streamChat, startVoiceRecognition, type Msg } from "@/lib/api";
import { AVAILABLE_MODELS, type ModelId } from "@/components/ModelSelector";

interface ArenaStreamResult {
  modelId: ModelId;
  content: string;
  isStreaming: boolean;
  startTime: number;
  ttft: number | null;
  totalTime: number | null;
  tokenCount: number;
  costEstimate: number;
}

const COST_PER_1K_TOKENS: Record<string, number> = {
  "google/gemini-3-flash-preview": 0.00015,
  "google/gemini-2.5-pro": 0.00125,
  "anthropic/claude-3.5-sonnet": 0.003,
  "openai/gpt-4o": 0.0025,
  "openai/gpt-4o-mini": 0.00015,
  "deepseek/deepseek-r1": 0.00055,
  "meta-llama/llama-3.2-3b-instruct:free": 0.0,
};

const ARENA_PROMPTS = [
  "Explain quantum entanglement with an analogy a 10-year-old would understand.",
  "Write an optimized TypeScript function to compute the longest palindromic substring in O(n) time.",
  "Draft a compelling 3-point strategy for a SaaS company transitioning from PLG to Enterprise Sales.",
];

const Arena = () => {
  const [modelA, setModelA] = useState<ModelId>("google/gemini-3-flash-preview");
  const [modelB, setModelB] = useState<ModelId>("anthropic/claude-3.5-sonnet");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [winner, setWinner] = useState<"A" | "B" | "Tie" | null>(null);

  const [resultA, setResultA] = useState<ArenaStreamResult>({
    modelId: modelA,
    content: "",
    isStreaming: false,
    startTime: 0,
    ttft: null,
    totalTime: null,
    tokenCount: 0,
    costEstimate: 0,
  });

  const [resultB, setResultB] = useState<ArenaStreamResult>({
    modelId: modelB,
    content: "",
    isStreaming: false,
    startTime: 0,
    ttft: null,
    totalTime: null,
    tokenCount: 0,
    costEstimate: 0,
  });

  const voiceControllerRef = useRef<{ stop: () => void } | null>(null);

  const handleRunArena = async (customPrompt?: string) => {
    const textToRun = customPrompt || prompt;
    if (!textToRun.trim() || isGenerating) return;
    if (!customPrompt) setPrompt("");

    setIsGenerating(true);
    setWinner(null);

    const now = Date.now();

    setResultA({
      modelId: modelA,
      content: "",
      isStreaming: true,
      startTime: now,
      ttft: null,
      totalTime: null,
      tokenCount: 0,
      costEstimate: 0,
    });

    setResultB({
      modelId: modelB,
      content: "",
      isStreaming: true,
      startTime: now,
      ttft: null,
      totalTime: null,
      tokenCount: 0,
      costEstimate: 0,
    });

    const runStream = async (
      modelId: ModelId,
      setResult: React.Dispatch<React.SetStateAction<ArenaStreamResult>>
    ) => {
      let accumulated = "";
      let firstTokenTime: number | null = null;

      try {
        await streamChat({
          messages: [{ role: "user", content: textToRun }],
          model: modelId,
          onDelta: (chunk) => {
            if (!firstTokenTime) {
              firstTokenTime = Date.now() - now;
            }
            accumulated += chunk;
            const approxTokens = Math.ceil(accumulated.split(/\s+/).length * 1.3);
            const rate = COST_PER_1K_TOKENS[modelId] || 0.001;
            const cost = (approxTokens / 1000) * rate;

            setResult((prev) => ({
              ...prev,
              content: accumulated,
              ttft: firstTokenTime,
              tokenCount: approxTokens,
              costEstimate: cost,
            }));
          },
          onDone: () => {
            const finishTime = Date.now() - now;
            setResult((prev) => ({
              ...prev,
              isStreaming: false,
              totalTime: finishTime,
            }));
          },
        });
      } catch (e: any) {
        setResult((prev) => ({
          ...prev,
          isStreaming: false,
          content: `Error: ${e.message || "Model execution failed"}`,
          totalTime: Date.now() - now,
        }));
      }
    };

    await Promise.all([runStream(modelA, setResultA), runStream(modelB, setResultB)]);
    setIsGenerating(false);
    toast.success("Arena benchmark run complete!");
  };

  const toggleVoice = () => {
    if (isListening) {
      voiceControllerRef.current?.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    toast.info("Listening for prompt...");

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

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-primary-foreground">
                <Swords className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground font-heading">Multi-Model Arena & Cost Benchmark</h1>
                <p className="text-[11px] text-muted-foreground">
                  Run side-by-side inference comparisons, measure Time-To-First-Token (TTFT), throughput, and real-world token cost
                </p>
              </div>
            </div>

            {winner && (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-3 py-1 rounded-xl text-xs font-bold font-mono">
                <Trophy className="h-3.5 w-3.5" />
                <span>Winner: {winner === "Tie" ? "Tie" : `Model ${winner}`}</span>
              </div>
            )}
          </div>

          {/* Model Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-primary">Model A:</span>
              <Select value={modelA} onValueChange={(v) => setModelA(v as ModelId)} disabled={isGenerating}>
                <SelectTrigger className="h-8 text-xs rounded-xl">
                  <SelectValue placeholder="Model A" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.name} ({m.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-purple-400">Model B:</span>
              <Select value={modelB} onValueChange={(v) => setModelB(v as ModelId)} disabled={isGenerating}>
                <SelectTrigger className="h-8 text-xs rounded-xl">
                  <SelectValue placeholder="Model B" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.name} ({m.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Starter Benchmarks */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground flex-shrink-0">Benchmarks:</span>
            {ARENA_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  setPrompt(p);
                  handleRunArena(p);
                }}
                className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all flex-shrink-0 truncate max-w-xs"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Side-by-Side Dual Arena Stage */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-y-auto bg-muted/10">
          {/* Arena Pane A */}
          <Card className="flex flex-col border-border rounded-2xl overflow-hidden bg-card shadow-sm">
            <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-xs font-bold text-foreground">
                  {AVAILABLE_MODELS.find((m) => m.id === modelA)?.name || modelA}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {resultA.ttft ? `${resultA.ttft}ms TTFT` : "--"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" /> {resultA.tokenCount} tokens
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-500 font-bold">
                  <DollarSign className="h-3 w-3" /> ${resultA.costEstimate.toFixed(5)}
                </span>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {resultA.content ? (
                resultA.content
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                  {resultA.isStreaming ? "Generating response..." : "Awaiting prompt..."}
                </div>
              )}
            </div>

            {resultA.content && !isGenerating && (
              <div className="p-2.5 border-t border-border bg-muted/10 flex items-center justify-between">
                <Button
                  size="sm"
                  variant={winner === "A" ? "default" : "outline"}
                  onClick={() => {
                    setWinner("A");
                    toast.success("Voted Model A as superior response!");
                  }}
                  className="h-7 text-xs rounded-lg gap-1"
                >
                  <Trophy className="h-3 w-3" /> Vote Model A
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(resultA.content);
                    toast.success("Model A response copied!");
                  }}
                  className="h-7 text-xs rounded-lg"
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
            )}
          </Card>

          {/* Arena Pane B */}
          <Card className="flex flex-col border-border rounded-2xl overflow-hidden bg-card shadow-sm">
            <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                <span className="text-xs font-bold text-foreground">
                  {AVAILABLE_MODELS.find((m) => m.id === modelB)?.name || modelB}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {resultB.ttft ? `${resultB.ttft}ms TTFT` : "--"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" /> {resultB.tokenCount} tokens
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-500 font-bold">
                  <DollarSign className="h-3 w-3" /> ${resultB.costEstimate.toFixed(5)}
                </span>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {resultB.content ? (
                resultB.content
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                  {resultB.isStreaming ? "Generating response..." : "Awaiting prompt..."}
                </div>
              )}
            </div>

            {resultB.content && !isGenerating && (
              <div className="p-2.5 border-t border-border bg-muted/10 flex items-center justify-between">
                <Button
                  size="sm"
                  variant={winner === "B" ? "default" : "outline"}
                  onClick={() => {
                    setWinner("B");
                    toast.success("Voted Model B as superior response!");
                  }}
                  className="h-7 text-xs rounded-lg gap-1"
                >
                  <Trophy className="h-3 w-3" /> Vote Model B
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(resultB.content);
                    toast.success("Model B response copied!");
                  }}
                  className="h-7 text-xs rounded-lg"
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Bottom Dual Execution Bar */}
        <div className="border-t border-border bg-card p-4">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRunArena(); }}
                placeholder="Enter prompt to execute on both models simultaneously..."
                disabled={isGenerating}
                className="h-10 text-xs pr-10 rounded-xl"
              />
              <button
                type="button"
                onClick={toggleVoice}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                  isListening ? "text-red-500 animate-pulse" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Voice Dictation"
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            </div>

            <Button
              onClick={() => handleRunArena()}
              disabled={!prompt.trim() || isGenerating}
              className="h-10 px-5 gap-2 text-xs font-semibold rounded-xl shadow-sm"
            >
              <Sparkles className="h-4 w-4" /> {isGenerating ? "Comparing Models..." : "Run Dual Benchmark"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Arena;
