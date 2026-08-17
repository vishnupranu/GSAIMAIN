import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Settings2, Bot, Play, Plus, Save, Trash2,
  Sparkles, Check, Send, RotateCcw, Wrench, Shield, Database, Globe, Code,
  Mic, MicOff, MessageSquare, Download, Upload, Layers, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import ModelSelector, { type ModelId } from "@/components/ModelSelector";
import { streamChat, startVoiceRecognition, type Msg } from "@/lib/api";
import { AGENT_BLUEPRINTS, type AgentBlueprint } from "@/data/agentBlueprints";

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
    capabilities: ["Code Generation", "System Tool Calling"],
    avatarEmoji: "⚡",
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent_growth_hacker",
    name: "Growth Engine",
    role: "Viral Marketing & Copywriting Strategist",
    systemPrompt: "You are a master growth strategist and copywriter. Create high-converting headlines, viral hook frameworks, marketing funnels, and data-driven user acquisition campaigns.",
    model: "google/gemini-3-flash-preview",
    capabilities: ["Web Search", "Data Processing"],
    avatarEmoji: "🚀",
    createdAt: new Date().toISOString(),
  },
  {
    id: "agent_researcher",
    name: "Deep Analyst",
    role: "Academic & Market Intelligence Researcher",
    systemPrompt: "You are an exhaustive research intelligence agent. Break down complex topics with structured data, source synthesis, objective risk analysis, and actionable executive summaries.",
    model: "google/gemini-3-flash-preview",
    capabilities: ["Web Search", "Data Processing", "Safety & Fact Verification"],
    avatarEmoji: "🔍",
    createdAt: new Date().toISOString(),
  }
];

const AVAILABLE_CAPABILITIES = [
  { id: "web_search", label: "Web Search & Fact Grounding", icon: Globe },
  { id: "code_gen", label: "Code Generation & Execution", icon: Code },
  { id: "data_proc", label: "Data Processing & Tabular Synthesis", icon: Database },
  { id: "tool_calling", label: "System Tool Calling (MCP SDK)", icon: Wrench },
  { id: "safety_guard", label: "Safety & Enterprise SAIF Guardrails", icon: Shield },
];

const EMOJI_OPTIONS = ["🤖", "⚡", "🚀", "🔍", "🧠", "💼", "🎨", "🛠️", "💡", "🔮", "🛡️", "🔬"];

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
  const navigate = useNavigate();
  const [agents, setAgents] = useState<CustomAgentConfig[]>(loadAgents);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || "");

  // Form State
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [avatarEmoji, setAvatarEmoji] = useState("🤖");

  // AI Auto-Builder Prompt
  const [aiBuilderPrompt, setAiBuilderPrompt] = useState("");
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  // Playground Chat State
  const [testMessages, setTestMessages] = useState<Msg[]>([]);
  const [testInput, setTestInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const voiceControllerRef = useRef<{ stop: () => void } | null>(null);

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
      systemPrompt: "You are a specialized AI assistant designed to automate complex domain workflows.",
      model: "google/gemini-3-flash-preview",
      capabilities: ["Web Search & Fact Grounding"],
      avatarEmoji: "🤖",
      createdAt: new Date().toISOString(),
    };
    const updated = [newAgent, ...agents];
    setAgents(updated);
    saveAgents(updated);
    setSelectedAgentId(newId);
    toast.success("New agent persona draft created!");
  };

  const handleLoadBlueprint = (blueprint: AgentBlueprint) => {
    setName(blueprint.name);
    setRole(blueprint.role);
    setSystemPrompt(blueprint.systemPrompt);
    setModel(blueprint.model as ModelId);
    setAvatarEmoji(blueprint.avatarEmoji);
    setCapabilities([
      ...(blueprint.capabilities.webSearch ? ["Web Search & Fact Grounding"] : []),
      ...(blueprint.capabilities.codeExecution ? ["Code Generation & Execution"] : []),
      ...(blueprint.capabilities.voiceSynthesis ? ["System Tool Calling (MCP SDK)"] : []),
      ...(blueprint.capabilities.imageGeneration ? ["Data Processing & Tabular Synthesis"] : []),
    ]);

    setTestMessages([
      {
        role: "assistant",
        content: `Hello! I am **${blueprint.name}** (${blueprint.role}). How can I assist your workflow today?`
      }
    ]);

    toast.success(`Loaded "${blueprint.name}" blueprint! Click Save Agent to persist.`);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Agent name is required");
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
      toast.error("You must have at least one agent");
      return;
    }
    const updated = agents.filter((a) => a.id !== id);
    setAgents(updated);
    saveAgents(updated);
    setSelectedAgentId(updated[0]?.id || "");
    toast.success("Agent removed");
  };

  const toggleCapability = (label: string) => {
    if (capabilities.includes(label)) {
      setCapabilities(capabilities.filter((c) => c !== label));
    } else {
      setCapabilities([...capabilities, label]);
    }
  };

  const handleAutoGenerate = async () => {
    if (!aiBuilderPrompt.trim() || isAutoGenerating) return;
    setIsAutoGenerating(true);

    const prompt = `Generate a specialized AI agent configuration based on this concept: "${aiBuilderPrompt}".
Respond ONLY with a JSON object:
{
  "name": "Catchy Agent Name",
  "role": "Agent Title/Role",
  "systemPrompt": "Comprehensive 3-sentence persona instruction",
  "emoji": "One suitable emoji"
}`;

    let accumulated = "";

    try {
      await streamChat({
        messages: [{ role: "user", content: prompt }],
        model: "google/gemini-3-flash-preview",
        systemPrompt: "You are an AI Agent Architect. Respond only in valid JSON.",
        onDelta: (chunk) => { accumulated += chunk; },
        onDone: () => {
          setIsAutoGenerating(false);
          try {
            const cleaned = accumulated.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            if (parsed.name) setName(parsed.name);
            if (parsed.role) setRole(parsed.role);
            if (parsed.systemPrompt) setSystemPrompt(parsed.systemPrompt);
            if (parsed.emoji) setAvatarEmoji(parsed.emoji);
            toast.success("Agent profile auto-generated!");
          } catch {
            setName(aiBuilderPrompt);
            setRole("Specialist Consultant");
            setSystemPrompt(`You are an expert AI persona specializing in ${aiBuilderPrompt}.`);
            toast.success("Agent drafted.");
          }
        }
      });
    } catch (e: any) {
      setIsAutoGenerating(false);
      setName(aiBuilderPrompt);
      setRole("Autonomous Specialist");
      toast.success("Agent drafted.");
    }
  };

  const handleSendTest = async (overridePrompt?: string) => {
    const textToSend = overridePrompt || testInput;
    if (!textToSend.trim() || isStreaming) return;
    const trimmed = textToSend.trim();
    if (!overridePrompt) setTestInput("");

    const userMsg: Msg = { role: "user", content: trimmed };
    setTestMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const personaPrompt = `${systemPrompt}
Always stay in character as "${name}" (${role}).
Capabilities: ${capabilities.join(", ") || "General Intelligence"}.`;

    let reply = "";

    try {
      await streamChat({
        messages: [...testMessages, userMsg],
        model,
        systemPrompt: personaPrompt,
        onDelta: (chunk) => {
          reply += chunk;
          setTestMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last !== testMessages[0]) {
              return [...prev.slice(0, -1), { role: "assistant", content: reply }];
            }
            return [...prev, { role: "assistant", content: reply }];
          });
        },
        onDone: () => {
          setIsStreaming(false);
        }
      });
    } catch (e: any) {
      setIsStreaming(false);
      toast.error(e.message || "Failed to get response");
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      voiceControllerRef.current?.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    toast.info("Listening... Speak your prompt.");

    const controller = startVoiceRecognition({
      onResult: (transcript) => {
        setTestInput(transcript);
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

  const handleExportJSON = () => {
    const current = agents.find((a) => a.id === selectedAgentId);
    if (!current) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(current, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `agent_${current.name.toLowerCase().replace(/\s+/g, "_")}.json`;
    a.click();
    toast.success("Agent profile exported as JSON!");
  };

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Left Agent Roster Sidebar */}
        <div className="w-full lg:w-72 border-r border-border bg-card/50 p-4 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-foreground" />
                <h2 className="text-sm font-bold text-foreground font-heading">Custom Agents</h2>
              </div>
              <Button size="sm" onClick={handleCreateNew} className="h-7 gap-1 text-xs rounded-lg">
                <Plus className="h-3.5 w-3.5" /> New
              </Button>
            </div>

            {/* AI Auto-Builder Bar */}
            <div className="rounded-xl border border-border bg-background p-3 space-y-2 shadow-sm">
              <span className="text-[10px] font-semibold text-primary uppercase flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Auto-Build with AI
              </span>
              <Input
                value={aiBuilderPrompt}
                onChange={(e) => setAiBuilderPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAutoGenerate(); }}
                placeholder="e.g. Financial Analyst, DevOps Bot..."
                className="h-8 text-xs rounded-lg"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAutoGenerate}
                disabled={isAutoGenerating || !aiBuilderPrompt.trim()}
                className="w-full h-7 text-xs rounded-lg gap-1"
              >
                <Sparkles className="h-3 w-3" /> {isAutoGenerating ? "Building..." : "Generate Profile"}
              </Button>
            </div>

            {/* Roster List */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block mb-1">
                Your Agents ({agents.length})
              </span>
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                    selectedAgentId === agent.id
                      ? "bg-accent border-border font-medium text-foreground shadow-sm"
                      : "border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg">{agent.avatarEmoji || "🤖"}</span>
                    <div className="truncate">
                      <p className="text-xs font-semibold truncate text-foreground">{agent.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{agent.role}</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(agent.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded transition-opacity"
                    title="Delete Agent"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              className="w-full text-xs h-8 gap-1.5 rounded-xl"
            >
              <Download className="h-3.5 w-3.5" /> Export Agent JSON
            </Button>
          </div>
        </div>

        {/* Center: Agent Configuration Form */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 border-r border-border space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground font-heading">Agent Configuration</h1>
              <p className="text-xs text-muted-foreground">Define identity, system instructions, and tool capabilities</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/chat?q=${encodeURIComponent(`[Chatting with ${name}] Hello!`)}`)}
                className="h-8 gap-1 text-xs rounded-xl"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Full Chat
              </Button>
              <Button size="sm" onClick={handleSave} className="h-8 gap-1.5 text-xs rounded-xl shadow-sm">
                <Save className="h-3.5 w-3.5" /> Save Agent
              </Button>
            </div>
          </div>

          {/* Industry Blueprints Carousel */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Load Specialized Blueprint
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AGENT_BLUEPRINTS.map((bp) => (
                <button
                  key={bp.id}
                  onClick={() => handleLoadBlueprint(bp)}
                  className="p-2.5 rounded-xl border border-border bg-card/60 hover:bg-accent/50 text-left transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{bp.avatarEmoji}</span>
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {bp.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{bp.role}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Identity Section */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Persona Identity</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Agent Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aura Research Partner"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Avatar Emoji</label>
                <div className="flex items-center gap-1 flex-wrap">
                  {EMOJI_OPTIONS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setAvatarEmoji(em)}
                      className={`h-7 w-7 rounded-lg text-sm transition-transform ${
                        avatarEmoji === em ? "bg-accent scale-110 ring-1 ring-border" : "hover:bg-muted"
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Role & Persona Title</label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Lead Distributed Systems Engineer"
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* System Prompt & Intelligence */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Instructions</h3>
              <div className="w-48">
                <ModelSelector value={model} onChange={setModel} disabled={isStreaming} />
              </div>
            </div>

            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are an autonomous AI specialist..."
              rows={5}
              className="text-xs font-mono rounded-xl resize-none leading-relaxed"
            />
          </div>

          {/* Tool Capabilities Matrix */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enabled Tool Capabilities</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {AVAILABLE_CAPABILITIES.map((cap) => {
                const Icon = cap.icon;
                const active = capabilities.includes(cap.label);
                return (
                  <button
                    key={cap.id}
                    type="button"
                    onClick={() => toggleCapability(cap.label)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      active
                        ? "bg-primary/10 border-primary text-foreground shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-medium">{cap.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Playground */}
        <div className="w-full lg:w-96 flex flex-col bg-card/30">
          <div className="p-3.5 border-b border-border bg-card/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">{avatarEmoji}</span>
              <div>
                <h3 className="text-xs font-bold text-foreground font-heading">Interactive Playground</h3>
                <p className="text-[10px] text-muted-foreground">Test {name} in real-time</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() =>
                setTestMessages([
                  { role: "assistant", content: `Hello! I am **${name}** (${role}). How can I assist your workflow today?` }
                ])
              }
              title="Reset Playground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Starter Questions Chips */}
          <div className="px-3 py-2 border-b border-border/50 bg-muted/20 flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[9px] font-bold uppercase text-muted-foreground flex-shrink-0">Starter Prompts:</span>
            {["Evaluate my pitch deck", "Review architecture", "Write a summary"].map((q, i) => (
              <button
                key={i}
                onClick={() => handleSendTest(q)}
                className="px-2 py-0.5 rounded-full border border-border bg-background text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-all flex-shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {testMessages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="h-6 w-6 rounded-lg bg-foreground text-primary-foreground flex items-center justify-center text-xs flex-shrink-0">
                    {avatarEmoji}
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-foreground text-primary-foreground"
                      : "bg-card border border-border text-foreground shadow-sm whitespace-pre-wrap"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isStreaming && testMessages[testMessages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2">
                <div className="h-6 w-6 rounded-lg bg-foreground text-primary-foreground flex items-center justify-center text-xs animate-pulse">
                  {avatarEmoji}
                </div>
                <div className="rounded-xl bg-card border border-border px-3 py-2 text-xs text-muted-foreground">
                  Typing response...
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border bg-card/60">
            <div className="flex items-center gap-1.5">
              <Input
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendTest(); }}
                placeholder={`Ask ${name}...`}
                className="h-8 text-xs rounded-xl"
              />
              <button
                type="button"
                onClick={toggleVoice}
                className={`p-2 rounded-xl border border-border transition-colors ${
                  isListening ? "bg-red-500 text-white animate-pulse" : "bg-card text-muted-foreground hover:text-foreground"
                }`}
                title="Voice Dictation"
              >
                {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </button>
              <Button
                size="icon"
                onClick={() => handleSendTest()}
                disabled={!testInput.trim() || isStreaming}
                className="h-8 w-8 rounded-xl flex-shrink-0"
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
