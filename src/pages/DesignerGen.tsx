import { useState } from "react";
import { motion } from "framer-motion";
import {
  Palette, Sparkles, Download, Copy, Check,
  Code, Eye, Layout, Image as ImageIcon, Layers, RefreshCw, ZoomIn, ZoomOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import ModelSelector, { type ModelId } from "@/components/ModelSelector";
import { streamChat } from "@/lib/api";

const DESIGN_MODES = [
  { id: "svg_logo", label: "SVG Vector Logo & Icon" },
  { id: "ui_card", label: "Modern UI Component Wireframe" },
  { id: "brand_poster", label: "Digital Poster & Hero Banner" },
  { id: "color_palette", label: "Design Token & Palette System" },
];

const DEFAULT_SVG = `<svg viewBox="0 0 600 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <rect width="600" height="400" rx="20" fill="url(#bgGrad)" stroke="#334155" stroke-width="2"/>
  
  <circle cx="150" cy="120" r="100" fill="#38bdf8" opacity="0.15" filter="url(#glow)"/>
  <circle cx="450" cy="280" r="120" fill="#c084fc" opacity="0.12" filter="url(#glow)"/>

  <!-- Geometric Symbol -->
  <g transform="translate(300, 160)">
    <polygon points="0,-60 52,30 -52,30" fill="none" stroke="url(#glowGrad)" stroke-width="4" filter="url(#glow)"/>
    <polygon points="0,60 -52,-30 52,-30" fill="none" stroke="url(#glowGrad)" stroke-width="2" opacity="0.6"/>
    <circle cx="0" cy="0" r="14" fill="url(#glowGrad)"/>
  </g>

  <!-- Typography -->
  <text x="300" y="270" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="bold" fill="#ffffff" letter-spacing="3">
    GUIDESOFT
  </text>
  <text x="300" y="300" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500" fill="#94a3b8" letter-spacing="4">
    AI DESIGN SYSTEM & VECTOR STUDIO
  </text>
</svg>`;

const DesignerGen = () => {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState("svg_logo");
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [svgCode, setSvgCode] = useState(DEFAULT_SVG);
  const [canvasBg, setCanvasBg] = useState<"dark" | "light" | "checker">("dark");
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);

    const systemPrompt = `You are an elite vector graphic designer and UI design system architect.
When asked to create a design, output ONLY a standalone, valid, highly aesthetic <svg>...</svg> XML element.
Use viewBox="0 0 800 600" width="100%" height="100%".
Incorporate modern visual polish: linearGradient, drop filters, modern typography, sleek geometry, and harmonious color palettes.
Output ONLY the raw <svg> string without any markdown code fence wrappers or surrounding text.`;

    let accumulated = "";

    try {
      await streamChat({
        messages: [{ role: "user", content: `Design ${mode}: ${prompt}` }],
        model,
        systemPrompt,
        onDelta: (chunk) => {
          accumulated += chunk;
        },
        onDone: () => {
          setIsGenerating(false);
          // Clean possible markdown wrappers
          let cleaned = accumulated.replace(/```xml/g, "").replace(/```svg/g, "").replace(/```/g, "").trim();
          const svgMatch = cleaned.match(/<svg[\s\S]*<\/svg>/i);
          if (svgMatch) {
            setSvgCode(svgMatch[0]);
            toast.success("Vector design compiled successfully!");
          } else {
            setSvgCode(cleaned);
            toast.info("Design output updated.");
          }
        },
      });
    } catch (e: any) {
      setIsGenerating(false);
      toast.error(e.message || "Failed to generate design");
    }
  };

  const handleCopySVG = () => {
    navigator.clipboard.writeText(svgCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("SVG code copied to clipboard!");
  };

  const handleDownloadSVG = () => {
    const blob = new Blob([svgCode], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(prompt || "design").replace(/[^a-zA-Z0-9]/g, "_")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded SVG file!");
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
        {/* Top Header */}
        <div className="border-b border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-primary-foreground">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">AI Designer & Vector Studio</h1>
                <p className="text-[11px] text-muted-foreground">Synthesize SVG graphics, brand logos, hero banners, and vector UI components</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopySVG} className="h-8 gap-1.5 text-xs">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy SVG
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadSVG} className="h-8 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> Export .SVG
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
              placeholder="Describe the design or visual asset (e.g. Futuristic Cyber AI Logo, Fintech Card Mockup)..."
              className="flex-1 min-w-[280px] h-9 text-xs"
            />

            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="w-56 h-9 text-xs">
                <Layout className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Design Mode" />
              </SelectTrigger>
              <SelectContent>
                {DESIGN_MODES.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-48">
              <ModelSelector value={model} onChange={setModel} />
            </div>

            <Button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} className="h-9 gap-1.5 text-xs">
              {isGenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate Design
            </Button>
          </div>
        </div>

        {/* Studio Viewport */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Visual Canvas */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-muted/20 relative overflow-hidden">
            {/* Canvas controls */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-card border border-border p-1 rounded-xl shadow-sm z-10">
              <Button
                variant={canvasBg === "dark" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={() => setCanvasBg("dark")}
              >
                Dark
              </Button>
              <Button
                variant={canvasBg === "light" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={() => setCanvasBg("light")}
              >
                Light
              </Button>
              <div className="h-4 w-px bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[10px] text-muted-foreground font-mono w-8 text-center">{Math.round(zoom * 100)}%</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Rendered SVG Preview */}
            <div
              style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
              className={`w-full max-w-2xl aspect-[3/2] rounded-2xl border p-4 shadow-2xl transition-transform flex items-center justify-center overflow-hidden ${
                canvasBg === "dark"
                  ? "bg-slate-950 border-slate-800"
                  : "bg-slate-50 border-slate-200"
              }`}
              dangerouslySetInnerHTML={{ __html: svgCode }}
            />
          </div>

          {/* Right Code Inspector */}
          <div className="w-80 border-l border-border bg-card flex flex-col">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Code className="h-4 w-4 text-foreground" />
                <span className="text-xs font-semibold text-foreground">SVG Source Code</span>
              </div>
            </div>
            <textarea
              value={svgCode}
              onChange={(e) => setSvgCode(e.target.value)}
              className="flex-1 p-3 font-mono text-[11px] leading-relaxed bg-background/50 border-0 focus:outline-none resize-none overflow-y-auto"
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DesignerGen;
