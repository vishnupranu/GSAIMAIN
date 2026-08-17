import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Settings2, Bot, Play, Plus, Save, Trash2,
  Sparkles, Check, Send, RotateCcw, Wrench, Shield, Database, Globe, Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import ModelSelector, { type ModelId } from "@/components/ModelSelector";
import { streamChat, type Msg } from "@/lib/api";

interface CustomAgentConfig {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  model: ModelId;
  capabilities: string[];
  avatarEmoji: string;
  createdAt: string;
}

const DEFAULT_AGENTS: CustomAgentConfig[] = [
  {
    id: "agent_dev_mentor",
    name: "Code Architect",
    role: "Senior Full-Stack Engineer & System Designer",
    systemPrompt: "You are a world-class senior software architect. Provide clear, optimized, clean-code solutions with production-ready patterns, edge-case coverage, and elegant architectural explanations.",
    model: "google/gemini-3-flash-preview",
    capabilities: ["Code Generation", "Refactoring", "Architecture Reviews"],
    avatarEmoji: "⚡",
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent_growth_hacker",
    name: "Growth Engine",
    role: "Viral Marketing & Copywriting Strategist",
    systemPrompt: "You are a master growth strategist and copywriter. Create high-converting headlines, viral hook frameworks, marketing funnels, and data-driven user acquisition campaigns.",
    model: "google/gemini-3-flash-preview",
    capabilities: ["Copywriting", "SEO Strategy", "Funnel Optimization"],
    avatarEmoji: "🚀",
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent_researcher",
    name: "Deep Analyst",
    role: "Academic & Market Intelligence Researcher",
    systemPrompt: "You are an exhaustive research intelligence agent. Break down complex topics with structured data, source synthesis, objective risk analysis, and actionable executive summaries.",
    model: "google/gemini-3-flash-preview",
    capabilities: ["Data Synthesis", "Market Sizing", "Competitive Intel"],
    avatarEmoji: "🔍",
    createdAt: new Date().toISOString(),
  }
];

const AVAILABLE_CAPABILITIES = [
  { id: "Code Generation", icon: Code, label: "Code & Architecture" },
  { id: "Web Search", icon: Globe, label: "Live Web Intel" },
  { id: "Data Processing", icon: Database, label: "Data & Schema Analysis" },
  { id: "System Tool Calling", icon: Wrench, label: "MCP Tool Execution" },
  { id: "Safety & Fact Verification", icon: Shield, label: "Fact & Bias Auditing" },
];

const EMOJI_OPTIONS = ["🤖", "⚡", "🚀", "🔍", "🧠", "💼", "🎨", "🛠️", "💡", "🔮"];

const STORAGE_KEY = "guidesoft_custom_agents";

function loadAgents(): CustomAgentConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AGENTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_AGENTS;
  } catch {
    return DEFAULT_AGENTS;
  }
}

function saveAgents(agents: CustomAgentConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
  } catch {}
}

const CustomAgent = () => {
  const [agents, setAgents] = useState<CustomAgentConfig[]>(loadAgents);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || "");

  // Form State
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [avatarEmoji, setAvatarEmoji] = useState("🤖");

  // Playground Chat State
  const [testMessages, setTestMessages] = useState<Msg[]>([]);
  const [testInput, setTestInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load selected agent into form
  useEffect(() => {
    const agent = agents.find((a) => a.id === selectedAgentId);
    if (agent) {
      setName(agent.name);
      setRole(agent.role);
      setSystemPrompt(agent.systemPrompt);
      setModel(agent.model);
      setCapabilities(agent.capabilities || []);
      setAvatarEmoji(agent.avatarEmoji || "🤖");
      setTestMessages([
        {
          role: "assistant",
          content: `Hello! I am **${agent.name}** (${agent.role}). How can I assist your workflow today?`
        }
      ]);
    }
  }, [selectedAgentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [testMessages]);

  const handleCreateNew = () => {
    const newId = `agent_${Date.now()}`;
    const newAgent: CustomAgentConfig = {
      id: newId,
      name: "New Custom Agent",
      role: "Specialized AI Assistant",
      systemPrompt: "You are a helpful and specialized AI agent tailored for custom workflows.",
      model: "google/gemini-3-flash-preview",
      capabilities: ["Code Generation"],
      avatarEmoji: "🤖",
      createdAt: new Date().toISOString(),
    };
    const updated = [newAgent, ...agents];
    setAgents(updated);
    saveAgents(updated);
    setSelectedAgentId(newId);
    toast.success("New agent created. Customize below!");
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Agent name cannot be empty");
      return;
    }
    const updated = agents.map((a) =>
      a.id === selectedAgentId
        ? { ...a, name, role, systemPrompt, model, capabilities, avatarEmoji }
        : a
    );
    setAgents(updated);
    saveAgents(updated);
    toast.success(`Agent "${name}" saved!`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (agents.length <= 1) {
      toast.error("You must keep at least one custom agent.");
      return;
    }
    const updated = agents.filter((a) => a.id !== id);
    setAgents(updated);
    saveAgents(updated);
    if (selectedAgentId === id) {
      setSelectedAgentId(updated[0].id);
    }
    toast.success("Agent removed");
  };

  const toggleCapability = (cap: string) => {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const handleSendTest = async () => {
    const trimmed = testInput.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: Msg = { role: "user", content: trimmed };
    const newMsgs = [...testMessages, userMsg];
    setTestMessages(newMsgs);
    setTestInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let reply = "";

    const enrichedSystemPrompt = `
${systemPrompt}

You possess these activated capabilities: ${capabilities.join(", ") || "General reasoning"}.
Always stay in character as "${name}" (${role}).
`.trim();

    try {
      await streamChat({
        messages: newMsgs.filter((m) => m.content !== testMessages[0]?.content),
        model,
        systemPrompt: enrichedSystemPrompt,
        onDelta: (chunk) => {
          reply += chunk;
          setTestMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last !== testMessages[0]) {
              return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: reply } : m));
            }
            return [...prev, { role: "assistant", content: reply }];
          });
        },
        onDone: () => setIsStreaming(false),
        signal: controller.signal,
      });
    } catch (e: any) {
      if (e.name === "AbortError") return;
      setIsStreaming(false);
      toast.error(e.message || "Failed to get agent response");
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Left: Agent Roster */}
        <div className="w-72 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Custom Agents</h2>
            </div>
            <Button size="sm" variant="outline" onClick={handleCreateNew} className="h-8 gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" /> New
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                  selectedAgentId === agent.id
                    ? "bg-accent border border-border shadow-sm text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background border border-border text-lg flex-shrink-0">
                  {agent.avatarEmoji || "🤖"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-foreground">{agent.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{agent.role}</p>
                </div>
                <button
                  onClick={(e) => handleDelete(agent.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                  title="Delete Agent"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Agent Configuration Studio */}
        <div className="flex-1 border-r border-border overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <span>{avatarEmoji}</span>
                <span>{name || "Configure Agent"}</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Define identity, instructions, and capabilities.</p>
            </div>
            <Button onClick={handleSave} className="gap-1.5">
              <Save className="h-4 w-4" /> Save Agent
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Agent Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Code Architect" />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Role / Specialization</label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior Tech Lead" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Base AI Model</label>
              <ModelSelector value={model} onChange={setModel} />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Avatar Emoji</label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatarEmoji(emoji)}
                    className={`h-8 w-8 rounded-lg border text-sm flex items-center justify-center transition-all ${
                      avatarEmoji === emoji ? "border-foreground bg-accent scale-110" : "border-border hover:bg-accent"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              System Instructions & Behavioral Rules
            </label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              placeholder="Define how the agent thinks, formulates responses, formats outputs, and handles complex instructions..."
              className="font-mono text-xs leading-relaxed"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-2 block">Agent Capabilities</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_CAPABILITIES.map((cap) => {
                const Icon = cap.icon;
                const active = capabilities.includes(cap.id);
                return (
                  <button
                    key={cap.id}
                    type="button"
                    onClick={() => toggleCapability(cap.id)}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      active
                        ? "border-foreground bg-accent text-foreground shadow-sm"
                        : "border-border text-muted-foreground hover:bg-accent/40"
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs font-medium flex-1">{cap.label}</span>
                    {active && <Check className="h-3.5 w-3.5 text-foreground" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Live Interactive Agent Playground */}
        <div className="w-96 bg-card flex flex-col">
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-foreground" />
              <h3 className="text-xs font-semibold text-foreground">Interactive Playground</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() =>
                setTestMessages([
                  {
                    role: "assistant",
                    content: `Hello! I am **${name}** (${role}). How can I assist you?`
                  }
                ])
              }
              title="Reset Chat"
            >
              <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {testMessages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-xs flex-shrink-0">
                    {avatarEmoji}
                  </div>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed max-w-[85%] ${
                    m.role === "user"
                      ? "bg-foreground text-primary-foreground rounded-br-none"
                      : "bg-muted text-foreground rounded-bl-none border border-border"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}
            {isStreaming && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                <span>{name} is thinking...</span>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border bg-background">
            <div className="flex items-center gap-2">
              <Input
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendTest();
                  }
                }}
                placeholder={`Message ${name}...`}
                className="text-xs h-9"
              />
              <Button
                size="icon"
                onClick={handleSendTest}
                disabled={!testInput.trim() || isStreaming}
                className="h-9 w-9 flex-shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CustomAgent;
