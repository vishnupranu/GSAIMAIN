import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, Play, Sparkles, RotateCcw, Copy, Download,
  Volume2, VolumeX, Mic, MicOff, Check, MessageSquare, Bot, Plus, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { streamChat, startVoiceRecognition, speakText, type Msg } from "@/lib/api";
import { AGENT_BLUEPRINTS, type AgentBlueprint } from "@/data/agentBlueprints";

interface SwarmMessage {
  agentId: string;
  agentName: string;
  agentRole: string;
  agentEmoji: string;
  content: string;
  timestamp: string;
}

const SWARM_TEMPLATES = [
  {
    title: "🚀 Startup Pitch & Technical Diligence",
    prompt: "Evaluate our AI developer workspace product for YC Series A, assess distributed cloud scaling risks, and design a viral product-led growth loop.",
    agentIds: ["vc-advisor", "cloud-architect", "growth-hacker"],
  },
  {
    title: "🎨 Next-Gen Spatial Design & UX Audit",
    prompt: "Design an Apple HIG-compliant AI music & audio synthesizer UI, ensure WCAG AAA accessibility, and architect the Web Audio DSP backend.",
    agentIds: ["design-system-lead", "cloud-architect", "vc-advisor"],
  },
  {
    title: "🔬 Quantitative AI Research & Model Distillation",
    prompt: "Synthesize latest test-time compute scaling laws, formulate mathematical algorithmic backtesting equations, and assess production inference cost.",
    agentIds: ["phd-researcher", "quant-analyst", "cloud-architect"],
  },
];

const Swarm = () => {
  const [selectedAgents, setSelectedAgents] = useState<AgentBlueprint[]>([
    AGENT_BLUEPRINTS[0], // VC Advisor
    AGENT_BLUEPRINTS[1], // Cloud Architect
    AGENT_BLUEPRINTS[4], // Growth Hacker
  ]);
  const [userPrompt, setUserPrompt] = useState("");
  const [swarmMessages, setSwarmMessages] = useState<SwarmMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeSpeakerIndex, setActiveSpeakerIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voiceControllerRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [swarmMessages]);

  const toggleAgentSelection = (bp: AgentBlueprint) => {
    if (selectedAgents.some((a) => a.id === bp.id)) {
      if (selectedAgents.length <= 2) {
        toast.error("Swarm must have at least 2 collaborating agents");
        return;
      }
      setSelectedAgents(selectedAgents.filter((a) => a.id !== bp.id));
    } else {
      if (selectedAgents.length >= 5) {
        toast.error("Maximum 5 agents in a single swarm session");
        return;
      }
      setSelectedAgents([...selectedAgents, bp]);
    }
  };

  const handleStartSwarm = async (customPrompt?: string) => {
    const promptToRun = customPrompt || userPrompt;
    if (!promptToRun.trim() || isRunning) return;
    if (!customPrompt) setUserPrompt("");

    setIsRunning(true);
    setSwarmMessages([]);

    const history: Msg[] = [
      { role: "user", content: `COLLABORATIVE TASK OBJECTIVE:\n${promptToRun}` },
    ];

    try {
      for (let i = 0; i < selectedAgents.length; i++) {
        const agent = selectedAgents[i];
        setActiveSpeakerIndex(i);

        const currentSpeakerPrompt = `${agent.systemPrompt}
You are collaborating in a multi-agent roundtable swarm with other expert agents.
Review the user task and the previous experts' contributions. Add your unique specialized insights, critique assumptions, and provide specific next-level blueprints from your domain perspective.
Keep your response punchy, authoritative, and structured with concrete takeaways.`;

        let agentReply = "";

        const tempMsg: SwarmMessage = {
          agentId: agent.id,
          agentName: agent.name,
          agentRole: agent.role,
          agentEmoji: agent.avatarEmoji,
          content: "",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setSwarmMessages((prev) => [...prev, tempMsg]);

        await new Promise<void>((resolve, reject) => {
          streamChat({
            messages: history,
            model: "google/gemini-3-flash-preview",
            systemPrompt: currentSpeakerPrompt,
            onDelta: (chunk) => {
              agentReply += chunk;
              setSwarmMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: agentReply,
                };
                return updated;
              });
            },
            onDone: () => {
              history.push({
                role: "assistant",
                content: `[${agent.name} - ${agent.role}]:\n${agentReply}`,
              });
              resolve();
            },
          }).catch(reject);
        });

        await new Promise((r) => setTimeout(r, 600)); // Brief natural pause between agents
      }

      setIsRunning(false);
      setActiveSpeakerIndex(null);
      toast.success("Swarm collaboration round completed!");
    } catch (e: any) {
      setIsRunning(false);
      setActiveSpeakerIndex(null);
      toast.error(e.message || "Swarm execution failed");
    }
  };

  const handleCopy = () => {
    const text = swarmMessages
      .map((m) => `### ${m.agentEmoji} ${m.agentName} (${m.agentRole})\n${m.content}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Full Swarm transcript copied!");
  };

  const handleDownload = () => {
    const text = swarmMessages
      .map((m) => `## ${m.agentEmoji} ${m.agentName} (${m.agentRole})\n*${m.timestamp}*\n\n${m.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guidesoft_swarm_synthesis_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Swarm synthesis downloaded as Markdown!");
  };

  const toggleVoice = () => {
    if (isListening) {
      voiceControllerRef.current?.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    toast.info("Listening for your swarm prompt...");

    const controller = startVoiceRecognition({
      onResult: (transcript) => {
        setUserPrompt(transcript);
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
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground font-heading">Multi-Agent Swarm Intelligence</h1>
                <p className="text-[11px] text-muted-foreground">
                  Orchestrate collaborative roundtable debates and cross-domain co-creation across specialized AI agents
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={swarmMessages.length === 0}
                className="h-8 gap-1.5 text-xs rounded-xl"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />} Copy Synthesis
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={swarmMessages.length === 0}
                className="h-8 gap-1.5 text-xs rounded-xl"
              >
                <Download className="h-3.5 w-3.5" /> Export Markdown
              </Button>
            </div>
          </div>

          {/* Active Swarm Roster Selection */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex-shrink-0">
              Swarm Team ({selectedAgents.length}):
            </span>
            {AGENT_BLUEPRINTS.map((bp) => {
              const isSelected = selectedAgents.some((a) => a.id === bp.id);
              return (
                <button
                  key={bp.id}
                  onClick={() => toggleAgentSelection(bp)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs border transition-all flex-shrink-0 ${
                    isSelected
                      ? "bg-primary/10 border-primary text-foreground font-semibold shadow-xs"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{bp.avatarEmoji}</span>
                  <span>{bp.name.split(" ")[0]}</span>
                  {isSelected && <Check className="h-3 w-3 text-primary" />}
                </button>
              );
            })}
          </div>

          {/* Starter Collaboration Templates */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground flex-shrink-0">Starter Templates:</span>
            {SWARM_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onClick={() => {
                  setUserPrompt(tpl.prompt);
                  const newSelected = AGENT_BLUEPRINTS.filter((b) => tpl.agentIds.includes(b.id));
                  if (newSelected.length > 0) setSelectedAgents(newSelected);
                  handleStartSwarm(tpl.prompt);
                }}
                className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all flex-shrink-0"
              >
                {tpl.title}
              </button>
            ))}
          </div>
        </div>

        {/* Swarm Conversation Stage */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-muted/10">
          {swarmMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground font-heading">Initiate Multi-Agent Swarm</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Select 2 or more specialized personas above, enter a complex prompt, and watch the agents build, critique, and synthesize solutions together.
              </p>
            </div>
          ) : (
            swarmMessages.map((msg, idx) => {
              const isCurrentSpeaker = activeSpeakerIndex === idx && isRunning;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                    isCurrentSpeaker
                      ? "bg-card border-primary ring-2 ring-primary/20 shadow-lg"
                      : "bg-card/80 border-border shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-foreground text-primary-foreground flex items-center justify-center text-sm shadow-xs">
                        {msg.agentEmoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{msg.agentName}</span>
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                            {msg.agentRole}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isCurrentSpeaker && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-primary font-bold animate-pulse">
                          <span className="h-2 w-2 rounded-full bg-primary" /> Speaking...
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => speakText(msg.content)}
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                        title="Read aloud"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {msg.content || <span className="text-muted-foreground italic">Thinking & formulating thesis...</span>}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Bottom Input Controls */}
        <div className="border-t border-border bg-card p-4">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleStartSwarm(); }}
                placeholder="Enter collaborative mission or task for the swarm..."
                disabled={isRunning}
                className="h-10 text-xs pr-10 rounded-xl"
              />
              <button
                type="button"
                onClick={toggleVoice}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                  isListening ? "text-red-500 animate-pulse" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Voice Input"
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            </div>

            <Button
              onClick={() => handleStartSwarm()}
              disabled={!userPrompt.trim() || isRunning}
              className="h-10 px-5 gap-2 text-xs font-semibold rounded-xl shadow-sm"
            >
              <Sparkles className="h-4 w-4" /> {isRunning ? "Swarm Collaborating..." : "Execute Swarm"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Swarm;
