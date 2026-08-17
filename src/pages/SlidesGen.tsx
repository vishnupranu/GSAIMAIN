import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Presentation, Sparkles, ChevronLeft, ChevronRight, Maximize2,
  Minimize2, Download, Copy, Check, Layout, Palette, Play,
  ListOrdered, RefreshCw, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import ModelSelector, { type ModelId } from "@/components/ModelSelector";
import { streamChat } from "@/lib/api";

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
  "Pitch Deck for an AI-powered Developer Copilot",
  "Understanding Quantum Computing & Practical Qubits",
  "Quarterly Executive Business Review & 2026 Strategy",
  "Product Launch: Next-Gen Smart Home Ecosystem",
  "Engineering Deep-Dive: Event-Driven Microservices Architecture"
];

const SlidesGen = () => {
  const [topic, setTopic] = useState("");
  const [slideCount, setSlideCount] = useState("5");
  const [theme, setTheme] = useState("dark");
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [isGenerating, setIsGenerating] = useState(false);
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
  const presentationRef = useRef<HTMLDivElement>(null);

  const activeTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  const handleGenerate = async () => {
    if (!topic.trim() || isGenerating) return;
    setIsGenerating(true);
    setCurrentSlideIndex(0);

    const systemPrompt = `You are an expert slide presentation designer.
Generate a structured slide deck with exactly ${slideCount} slides based on the user's topic.
Respond ONLY with a valid JSON array of slide objects. Do not include markdown code blocks or commentary.
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
        messages: [{ role: "user", content: `Create a presentation on: ${topic}` }],
        model,
        systemPrompt,
        onDelta: (chunk) => {
          accumulated += chunk;
        },
        onDone: () => {
          setIsGenerating(false);
          try {
            // Clean markdown tags if model added them
            const cleaned = accumulated.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSlides(parsed);
              toast.success(`Generated ${parsed.length} slides!`);
            } else {
              throw new Error("Invalid format");
            }
          } catch {
            // Fallback parsing if output was slightly malformed
            setSlides([
              {
                title: topic,
                subtitle: "Generated Overview",
                points: accumulated.split("\n").filter((l) => l.trim().length > 5).slice(0, 5),
                callout: "AI Generated Insights",
                speakerNotes: "Review points above."
              }
            ]);
            toast.info("Slide content rendered.");
          }
        },
      });
    } catch (e: any) {
      setIsGenerating(false);
      toast.error(e.message || "Failed to generate slides");
    }
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
      <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="border-b border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-primary-foreground">
                <Presentation className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">AI Slide Deck Studio</h1>
                <p className="text-[11px] text-muted-foreground">Generate comprehensive presentation decks with structured speaker notes</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 gap-1.5 text-xs">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy Deck
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadHTML} className="h-8 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> Export HTML
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
              placeholder="Enter presentation topic (e.g. Modern Web Architecture, Q3 Growth Strategy)..."
              className="flex-1 min-w-[280px] h-9 text-xs"
            />

            <Select value={slideCount} onValueChange={setSlideCount}>
              <SelectTrigger className="w-28 h-9 text-xs">
                <ListOrdered className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Slides" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Slides</SelectItem>
                <SelectItem value="5">5 Slides</SelectItem>
                <SelectItem value="8">8 Slides</SelectItem>
                <SelectItem value="10">10 Slides</SelectItem>
              </SelectContent>
            </Select>

            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <Palette className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                {THEMES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-48">
              <ModelSelector value={model} onChange={setModel} />
            </div>

            <Button onClick={handleGenerate} disabled={!topic.trim() || isGenerating} className="h-9 gap-1.5 text-xs">
              {isGenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate Deck
            </Button>
          </div>

          {/* Quick template chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase flex-shrink-0">Ideas:</span>
            {TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onClick={() => { setTopic(tpl); }}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex-shrink-0"
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>

        {/* Main Presentation Stage */}
        <div className="flex flex-1 overflow-hidden">
          {/* Slide Navigator Thumbnails */}
          <div className="w-56 border-r border-border bg-card/60 p-3 overflow-y-auto space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
              Slides ({slides.length})
            </div>
            {slides.map((slide, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`w-full rounded-xl border p-2.5 text-left transition-all ${
                  currentSlideIndex === idx
                    ? "border-foreground bg-accent shadow-sm scale-[1.02]"
                    : "border-border/80 bg-background/50 hover:bg-accent/50 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold mb-1">
                  <span>Slide {idx + 1}</span>
                </div>
                <p className="text-xs font-semibold truncate text-foreground">{slide.title || "Untitled"}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-1">{slide.subtitle || slide.points?.[0]}</p>
              </button>
            ))}
          </div>

          {/* Active Slide Screen */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-muted/20 overflow-y-auto">
            <div
              ref={presentationRef}
              className={`relative w-full max-w-4xl aspect-[16/9] rounded-2xl border p-10 flex flex-col justify-between transition-all duration-300 ${activeTheme.bg} ${
                isFullscreen ? "fixed inset-0 z-50 rounded-none max-w-none aspect-auto p-16" : "shadow-xl"
              }`}
            >
              {/* Slide Header */}
              <div>
                <div className="flex items-center justify-between text-xs opacity-60 mb-2">
                  <span className="font-semibold uppercase tracking-wider">GUIDESOFT Slides</span>
                  <span>{currentSlideIndex + 1} / {slides.length}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">{currentSlide.title}</h2>
                {currentSlide.subtitle && (
                  <p className="text-sm sm:text-base opacity-80 font-normal">{currentSlide.subtitle}</p>
                )}
              </div>

              {/* Slide Content Points */}
              <div className="my-auto space-y-3 py-4">
                {currentSlide.points?.map((pt, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`rounded-xl border p-3.5 text-sm sm:text-base flex items-start gap-3 ${activeTheme.cardBg}`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/10 text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{pt}</span>
                  </motion.div>
                ))}

                {currentSlide.callout && (
                  <div className="rounded-xl border border-current/20 bg-current/5 p-3 text-xs sm:text-sm font-medium italic">
                    💡 {currentSlide.callout}
                  </div>
                )}
              </div>

              {/* Slide Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-current/10 text-xs opacity-70">
                <span>{topic || "AI Presentation"}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-current hover:bg-current/10"
                    onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentSlideIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-current hover:bg-current/10"
                    onClick={() => setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
                    disabled={currentSlideIndex === slides.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-current hover:bg-current/10"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Presenter Speaker Notes Drawer */}
            {currentSlide.speakerNotes && !isFullscreen && (
              <div className="w-full max-w-4xl mt-4 rounded-xl border border-border bg-card p-3.5 text-xs text-muted-foreground flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="text-foreground block mb-0.5">Presenter Notes:</strong>
                  <p>{currentSlide.speakerNotes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SlidesGen;
