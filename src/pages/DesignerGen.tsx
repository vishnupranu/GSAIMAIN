import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Palette, Sparkles, Download, Copy, Check,
  Code, Eye, Layout, Image as ImageIcon, Layers, RefreshCw, ZoomIn, ZoomOut, Mic, MicOff, Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import ModelSelector, { type ModelId } from "@/components/ModelSelector";
import { streamChat, startVoiceRecognition } from "@/lib/api";

const DESIGN_MODES = [
  { id: "svg_logo", label: "SVG Vector Logo & Icon" },
  { id: "ui_card", label: "Modern UI Component Wireframe" },
  { id: "brand_poster", label: "Digital Poster & Hero Banner" },
  { id: "color_palette", label: "Design Token & Palette System" },
];

const PRESETS = [
  { label: "⚡ Neon Cyberpunk Shield", prompt: "Glowing cyberpunk geometric hexagon shield logo with neon blue and purple gradients" },
  { label: "🌐 Cloud Architecture Diagram", prompt: "Modern cloud architecture topology diagram with microservices, database nodes, and API gateway" },
  { label: "✨ Glassmorphic App Icon", prompt: "Premium glassmorphic 3D mobile app icon with soft shadows and vibrant iridescent lighting" },
  { label: "📊 Analytics Infographic", prompt: "High-tech data analytics dashboard infographic with bar charts, line graphs, and KPI dials" },
];

const DEFAULT_SVG = `<svg viewBox="0 0 800 500" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="50%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <rect width="800" height="500" rx="20" fill="url(#bgGrad)" stroke="#1e293b" stroke-width="2"/>
  
  <circle cx="200" cy="150" r="140" fill="#38bdf8" opacity="0.12" filter="url(#glow)"/>
  <circle cx="600" cy="350" r="160" fill="#c084fc" opacity="0.1" filter="url(#glow)"/>

  <!-- Geometric Emblem -->
  <g transform="translate(400, 200)">
    <polygon points="0,-80 69,40 -69,40" fill="none" stroke="url(#glowGrad)" stroke-width="4" filter="url(#glow)"/>
    <polygon points="0,80 -69,-40 69,-40" fill="none" stroke="url(#glowGrad)" stroke-width="2" opacity="0.6"/>
    <circle cx="0" cy="0" r="18" fill="url(#glowGrad)"/>
  </g>

  <!-- Typography -->
  <text x="400" y="340" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" letter-spacing="4">
    GUIDESOFT
  </text>
  <text x="400" y="375" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500" fill="#94a3b8" letter-spacing="4">
    AUTONOMOUS VECTOR GRAPHIC STUDIO
  </text>
</svg>`;

const DesignerGen = () => {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState("svg_logo");
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [svgCode, setSvgCode] = useState(DEFAULT_SVG);
  const [canvasBg, setCanvasBg] = useState<"dark" | "light" | "checker">("dark");
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);
  const voiceControllerRef = useRef<{ stop: () => void } | null>(null);

  const generateWithPrompt = async (targetPrompt: string) => {
    if (!targetPrompt.trim() || isGenerating) return;
    setIsGenerating(true);

    const systemPrompt = `You are an elite vector graphic designer and UI design system architect.
When asked to create a design, output ONLY a standalone, valid, highly aesthetic <svg>...</svg> XML element.
Use viewBox="0 0 800 600" width="100%" height="100%".
Incorporate modern visual polish: linearGradient, drop filters, modern typography, sleek geometry, and harmonious color palettes.
Output ONLY the raw <svg> string without any markdown code fence wrappers or surrounding text.`;

    let accumulated = "";

    try {
      await streamChat({
        messages: [{ role: "user", content: `Design ${mode}: ${targetPrompt}` }],
        model,
        systemPrompt,
        onDelta: (chunk) => {
          accumulated += chunk;
        },
        onDone: () => {
          setIsGenerating(false);
          let cleaned = accumulated.replace(/```xml/g, "").replace(/```svg/g, "").replace(/```/g, "").trim();
          const svgMatch = cleaned.match(/<svg[\s\S]*<\/svg>/i);
          if (svgMatch) {
            setSvgCode(svgMatch[0]);
            toast.success("Vector design compiled successfully!");
          } else {
            setSvgCode(DEFAULT_SVG);
            toast.info("Vector structure synthesized.");
          }
        },
      });
    } catch (e: any) {
      setIsGenerating(false);
      toast.error(e.message || "Failed to generate design");
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      voiceControllerRef.current?.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    toast.info("Listening... Describe the vector artwork or logo you want.");

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

  const handleCopySVG = () => {
    navigator.clipboard.writeText(svgCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("SVG code copied to clipboard!");
  };

  const handleDownloadSVG = () => {
    const blob = new Blob([svgCode], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `guidesoft_design_${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("SVG file downloaded!");
  };

  const handleDownloadPNG = () => {
    try {
      const svgBlob = new Blob([svgCode], { type: "image/svg+xml;charset=utf-8" });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1600;
        canvas.height = 1000;
        const context = canvas.getContext("2d");
        if (context) {
          context.fillStyle = canvasBg === "light" ? "#f8fafc" : "#090d16";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const png = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.download = `guidesoft_art_${Date.now()}.png`;
          downloadLink.href = png;
          downloadLink.click();
          toast.success("High-res PNG (1600x1000) downloaded!");
        }
      };
      image.src = blobURL;
    } catch {
      toast.error("Failed to render raster PNG.");
    }
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
                <h1 className="text-base font-bold text-foreground font-heading">AI Designer</h1>
                <p className="text-[11px] text-muted-foreground">Autonomous SVG vector synthesis, icon design, and design token generators</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="h-8 w-44 text-xs rounded-xl">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  {DESIGN_MODES.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleCopySVG} className="h-8 gap-1.5 text-xs rounded-xl">
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />} Copy SVG
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadSVG} className="h-8 gap-1.5 text-xs rounded-xl">
                <Download className="h-3.5 w-3.5" /> SVG
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPNG} className="h-8 gap-1.5 text-xs rounded-xl">
                <Download className="h-3.5 w-3.5" /> PNG
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px]">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") generateWithPrompt(prompt); }}
                placeholder="Describe your design (e.g. Cyberpunk Hexagon Shield, Glassmorphic App Icon, Cloud Architecture Topology)..."
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
              <ModelSelector value={model} onChange={setModel} disabled={isGenerating} />
            </div>

            <Button
              onClick={() => generateWithPrompt(prompt)}
              disabled={!prompt.trim() || isGenerating}
              className="h-9 gap-1.5 text-xs rounded-xl shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" /> {isGenerating ? "Synthesizing..." : "Generate Vector"}
            </Button>
          </div>

          {/* Quick interactive presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase flex-shrink-0">Design Presets:</span>
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  setPrompt(p.prompt);
                  generateWithPrompt(p.prompt);
                }}
                className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all flex-shrink-0"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Studio Viewport */}
        <div className="grid flex-1 grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Main Visual Canvas (8 cols) */}
          <div className="lg:col-span-8 flex flex-col items-center justify-between p-4 sm:p-6 overflow-hidden bg-muted/10 border-b lg:border-b-0 lg:border-r border-border">
            {/* Canvas Toolbar */}
            <div className="flex items-center justify-between w-full mb-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={canvasBg === "dark" ? "default" : "outline"}
                  onClick={() => setCanvasBg("dark")}
                  className="h-7 text-xs rounded-lg"
                >
                  Dark Grid
                </Button>
                <Button
                  size="sm"
                  variant={canvasBg === "light" ? "default" : "outline"}
                  onClick={() => setCanvasBg("light")}
                  className="h-7 text-xs rounded-lg"
                >
                  Light Grid
                </Button>
                <Button
                  size="sm"
                  variant={canvasBg === "checker" ? "default" : "outline"}
                  onClick={() => setCanvasBg("checker")}
                  className="h-7 text-xs rounded-lg"
                >
                  Checkerboard
                </Button>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.1))}
                  className="h-7 w-7 rounded-lg"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-mono text-muted-foreground w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setZoom((prev) => Math.min(2, prev + 0.1))}
                  className="h-7 w-7 rounded-lg"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoom(1)}
                  className="h-7 text-xs rounded-lg text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              </div>
            </div>

            {/* Vector Render Container */}
            <div
              className={`flex-1 w-full rounded-2xl border border-border shadow-md flex items-center justify-center p-6 overflow-hidden transition-all ${
                canvasBg === "dark"
                  ? "bg-slate-950"
                  : canvasBg === "light"
                  ? "bg-slate-100"
                  : "bg-[linear-gradient(45deg,#ccc_25%,transparent_25%),linear-gradient(-45deg,#ccc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ccc_75%),linear-gradient(-45deg,transparent_75%,#ccc_75%)] bg-[size:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]"
              }`}
            >
              <div
                style={{ transform: `scale(${zoom})`, transition: "transform 0.15s ease" }}
                className="w-full max-w-[650px] aspect-[3/2] flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: svgCode }}
              />
            </div>
          </div>

          {/* SVG Code Inspector (4 cols) */}
          <div className="lg:col-span-4 flex flex-col bg-card/60 p-4 sm:p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SVG Source Code</h3>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">{svgCode.length} bytes</span>
            </div>

            <textarea
              value={svgCode}
              onChange={(e) => setSvgCode(e.target.value)}
              className="flex-1 w-full rounded-2xl border border-border bg-background p-4 text-xs font-mono text-foreground leading-relaxed resize-none focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DesignerGen;
