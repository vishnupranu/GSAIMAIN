import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Presentation, Sparkles, ChevronLeft, ChevronRight, Maximize2,
  Minimize2, Download, Copy, Check, Layout, Palette, Play,
  ListOrdered, RefreshCw, FileText, Mic, MicOff, Plus, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import ModelSelector, { type ModelId } from "@/components/ModelSelector";
import { streamChat, startVoiceRecognition } from "@/lib/api";

interface Slide {
  title: string;
  subtitle?: string;
  points: string[];
  callout?: string;
  speakerNotes?: string;
}

const THEMES = [
  { id: "dark", label: "Dark Obsidian", bg: "bg-slate-950 text-slate-100 border-slate-800", cardBg: "bg-slate-900/90 border-slate-800" },
  { id: "bauhaus", label: "Bauhaus Modern", bg: "bg-amber-50 text-slate-900 border-amber-200", cardBg: "bg-white border-amber-300 shadow-sm" },
  { id: "neon", label: "Cyberpunk Neon", bg: "bg-zinc-950 text-emerald-400 border-emerald-900/50", cardBg: "bg-zinc-900/80 border-emerald-500/30" },
  { id: "corporate", label: "Classic Indigo", bg: "bg-blue-950 text-white border-blue-900", cardBg: "bg-blue-900/60 border-blue-800" },
  { id: "clean", label: "Clean White", bg: "bg-white text-zinc-900 border-zinc-200 shadow-sm", cardBg: "bg-zinc-50 border-zinc-200" },
];

const TEMPLATES = [
  { label: "🚀 YC Pitch Deck", prompt: "Seed Stage Pitch Deck for an Autonomous AI Workspace with $1M ARR metrics" },
  { label: "⚡ Distributed Systems", prompt: "Engineering Deep-Dive: Event-Driven Microservices, Kafka & Rust Architecture" },
  { label: "📊 Q3 Executive Review", prompt: "Quarterly Executive Business Review: Revenue Expansion, CAC & Unit Economics" },
  { label: "✨ Product Keynote", prompt: "Product Launch Keynote: Next-Generation Spatial Intelligence & Multi-Model Agents" },
];

const SlidesGen = () => {
  const [topic, setTopic] = useState("");
  const [slideCount, setSlideCount] = useState("5");
  const [theme, setTheme] = useState("dark");
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([
    {
      title: "GUIDESOFT AI Presentation Suite",
      subtitle: "Transform prompts into executive-grade visual slide decks",
      points: [
        "Instant multi-slide generation powered by state-of-the-art LLMs",
        "Multiple architectural themes with responsive presentation views",
        "Includes speaker notes, visual key takeaways, and one-click exports"
      ],
      callout: "Enter any topic or select a template above to generate your deck.",
      speakerNotes: "Welcome everyone. Today we are exploring automated AI presentation generation."
    }
  ]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const voiceControllerRef = useRef<{ stop: () => void } | null>(null);

  const activeTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  // Keyboard navigation for Presenter mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides.length, isFullscreen]);

  const generateWithTopic = async (targetTopic: string) => {
    if (!targetTopic.trim() || isGenerating) return;
    setIsGenerating(true);
    setCurrentSlideIndex(0);

    const systemPrompt = `You are an expert slide presentation designer.
Generate a structured slide deck with exactly ${slideCount} slides based on the user's topic.
Respond ONLY with a valid JSON array of slide objects.
Each slide object MUST have this schema:
[
  {
    "title": "Slide Headline",
    "subtitle": "Optional descriptive context or key takeaway",
    "points": ["Clear bullet point 1", "High-impact point 2", "Data or architectural detail 3"],
    "callout": "Optional highlighted quote or executive metric",
    "speakerNotes": "Brief speaking points for the presenter"
  }
]`;

    let accumulated = "";

    try {
      await streamChat({
        messages: [{ role: "user", content: `Create a presentation on: ${targetTopic}` }],
        model,
        systemPrompt,
        onDelta: (chunk) => {
          accumulated += chunk;
        },
        onDone: () => {
          setIsGenerating(false);
          try {
            const cleaned = accumulated.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSlides(parsed);
              toast.success(`Generated ${parsed.length} slides!`);
              return;
            }
          } catch {}

          // Resilient fallback parser
          const lines = accumulated.split("\n").filter((l) => l.trim().length > 3);
          setSlides([
            {
              title: targetTopic,
              subtitle: "Executive Overview & Architecture",
              points: lines.slice(0, 4),
              callout: "GUIDESOFT Autonomous Intelligence",
              speakerNotes: "Key points summarized above."
            },
            {
              title: "Strategic Execution Plan",
              subtitle: "Roadmap & Key Metrics",
              points: lines.slice(4, 8).length > 0 ? lines.slice(4, 8) : ["Milestone tracking", "Unit economics", "Team ownership"],
              callout: "Target Delivery: Q3",
              speakerNotes: "Review execution milestones."
            }
          ]);
          toast.success("Presentation created!");
        },
      });
    } catch (e: any) {
      setIsGenerating(false);
      toast.error(e.message || "Failed to generate slides");
    }
  };

  const handleGenerate = () => {
    generateWithTopic(topic);
  };

  const handleTemplateClick = (tplPrompt: string) => {
    setTopic(tplPrompt);
    generateWithTopic(tplPrompt);
  };

  const toggleVoice = () => {
    if (isListening) {
      voiceControllerRef.current?.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    toast.info("Listening... Speak your presentation topic.");

    const controller = startVoiceRecognition({
      onResult: (transcript) => {
        setTopic(transcript);
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

  const handleAddSlide = () => {
    const newSlide: Slide = {
      title: `Slide ${slides.length + 1}: Key Objective`,
      subtitle: "Add descriptive details",
      points: ["Action item or architectural point 1", "Measurement metric 2", "Expected outcome 3"],
      callout: "Executive Highlight",
      speakerNotes: "Speaker notes for this slide."
    };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
    toast.success("New slide added!");
  };

  const handleDeleteSlide = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (slides.length <= 1) {
      toast.error("You must keep at least 1 slide");
      return;
    }
    const updated = slides.filter((_, i) => i !== index);
    setSlides(updated);
    setCurrentSlideIndex(Math.max(0, index - 1));
    toast.success("Slide deleted");
  };

  const handleCopy = () => {
    const text = slides
      .map(
        (s, i) =>
          `# Slide ${i + 1}: ${s.title}\n${s.subtitle || ""}\n\n${s.points.map((p) => `- ${p}`).join("\n")}\n\n${
            s.callout ? `> ${s.callout}\n\n` : ""
          }Speaker Notes: ${s.speakerNotes || ""}`
      )
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Deck copied as Markdown!");
  };

  const handleDownloadHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${topic || "AI Presentation"}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px; }
    .slide { max-width: 900px; margin: 0 auto 40px auto; background: #1e293b; border-radius: 16px; padding: 48px; border: 1px solid #334155; }
    h1 { font-size: 32px; margin-top: 0; color: #38bdf8; }
    h2 { font-size: 20px; color: #94a3b8; font-weight: normal; margin-bottom: 24px; }
    ul { font-size: 18px; line-height: 1.8; color: #cbd5e1; }
    .callout { background: rgba(56, 189, 248, 0.1); border-left: 4px solid #38bdf8; padding: 16px; border-radius: 8px; margin-top: 24px; font-weight: 500; }
    .notes { margin-top: 32px; font-size: 14px; color: #64748b; border-top: 1px dashed #334155; padding-top: 16px; }
  </style>
</head>
<body>
  ${slides
    .map(
      (s, i) => `
    <div class="slide">
      <div style="font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Slide ${i + 1} of ${slides.length}</div>
      <h1>${s.title}</h1>
      ${s.subtitle ? `<h2>${s.subtitle}</h2>` : ""}
      <ul>${s.points.map((p) => `<li>${p}</li>`).join("")}</ul>
      ${s.callout ? `<div class="callout">${s.callout}</div>` : ""}
      ${s.speakerNotes ? `<div class="notes"><strong>Speaker Notes:</strong> ${s.speakerNotes}</div>` : ""}
    </div>`
    )
    .join("")}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(topic || "presentation").replace(/[^a-zA-Z0-9]/g, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Presentation exported as HTML!");
  };

  const currentSlide = slides[currentSlideIndex] || slides[0];

  return (
    <AppLayout>
      <div className={`flex flex-col overflow-hidden ${isFullscreen ? "fixed inset-0 z-50 bg-background" : "h-[calc(100vh-3.5rem)]"}`}>
        {/* Top Control Bar */}
        <div className="border-b border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-primary-foreground">
                <Presentation className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground font-heading">AI Slide Deck Studio</h1>
                <p className="text-[11px] text-muted-foreground">Autonomous presentation generation with themes, speaker notes, and presenter mode</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="h-8 w-36 text-xs rounded-xl">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                  {THEMES.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 gap-1.5 text-xs rounded-xl">
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />} Copy Deck
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadHTML} className="h-8 gap-1.5 text-xs rounded-xl">
                <Download className="h-3.5 w-3.5" /> Export HTML
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 gap-1.5 text-xs rounded-xl"
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                {isFullscreen ? "Exit" : "Present"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px]">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
                placeholder="Enter presentation topic or thesis..."
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

            <Select value={slideCount} onValueChange={setSlideCount}>
              <SelectTrigger className="h-9 w-28 text-xs rounded-xl">
                <SelectValue placeholder="Slides" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Slides</SelectItem>
                <SelectItem value="5">5 Slides</SelectItem>
                <SelectItem value="8">8 Slides</SelectItem>
                <SelectItem value="10">10 Slides</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-48">
              <ModelSelector value={model} onChange={setModel} disabled={isGenerating} />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!topic.trim() || isGenerating}
              className="h-9 gap-1.5 text-xs rounded-xl shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" /> {isGenerating ? "Synthesizing..." : "Generate Deck"}
            </Button>
          </div>

          {/* Interactive Starter Templates */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase flex-shrink-0">Starter Decks:</span>
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

        {/* Main Canvas: Left Slide Thumbnails + Center Active Slide Canvas */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Thumbnail Strip */}
          <div className="w-64 border-r border-border bg-card/40 p-3 overflow-y-auto hidden md:flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Deck Slides ({slides.length})
                </span>
                <Button size="sm" variant="ghost" onClick={handleAddSlide} className="h-6 gap-1 text-[11px] p-1">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>

              {slides.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`group relative rounded-xl border p-2.5 text-left cursor-pointer transition-all ${
                    currentSlideIndex === idx
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-background hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground">Slide {idx + 1}</span>
                    <button
                      onClick={(e) => handleDeleteSlide(idx, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-xs font-semibold truncate text-foreground mt-0.5">{s.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Center Presentation Stage */}
          <div className="flex-1 flex flex-col items-center justify-between p-4 sm:p-8 overflow-y-auto bg-muted/10">
            <div className="w-full max-w-4xl flex-1 flex flex-col justify-center">
              <motion.div
                key={currentSlideIndex}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className={`w-full rounded-2xl border p-8 sm:p-12 shadow-xl ${activeTheme.bg} min-h-[380px] flex flex-col justify-between`}
              >
                <div>
                  <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
                    Slide {currentSlideIndex + 1} of {slides.length}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 font-heading">{currentSlide.title}</h2>
                  {currentSlide.subtitle && (
                    <p className="text-sm opacity-80 mb-6">{currentSlide.subtitle}</p>
                  )}

                  <ul className="space-y-3 text-sm sm:text-base leading-relaxed opacity-90 my-4">
                    {currentSlide.points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-current mt-2 flex-shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>

                  {currentSlide.callout && (
                    <div className="mt-6 rounded-xl border border-current/20 bg-current/5 p-4 text-xs sm:text-sm font-medium">
                      💡 {currentSlide.callout}
                    </div>
                  )}
                </div>

                {currentSlide.speakerNotes && (
                  <div className="mt-8 pt-4 border-t border-current/10 text-xs opacity-60 font-mono">
                    🗣️ Speaker Notes: {currentSlide.speakerNotes}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Bottom Slide Controller */}
            <div className="mt-4 flex items-center gap-4 bg-card border border-border px-4 py-2 rounded-2xl shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                className="h-8 w-8 rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-mono font-medium text-foreground">
                {currentSlideIndex + 1} / {slides.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                disabled={currentSlideIndex === slides.length - 1}
                onClick={() => setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
                className="h-8 w-8 rounded-xl"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SlidesGen;
