import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, Sparkles, Film, Play, Pause, Download,
  Copy, Check, Camera, Mic, Volume2, Clock, RefreshCw, Clapperboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import ModelSelector, { type ModelId } from "@/components/ModelSelector";
import { streamChat } from "@/lib/api";

interface StoryboardScene {
  sceneNumber: number;
  durationSeconds: number;
  visualDescription: string;
  cameraMovement: string;
  voiceoverScript: string;
  audioSfx: string;
}

interface VideoProject {
  title: string;
  aspectRatio: string;
  totalDurationSeconds: number;
  style: string;
  scenes: StoryboardScene[];
}

const STYLES = [
  { id: "cinematic_scifi", label: "Cinematic Sci-Fi Film (4K Arri)" },
  { id: "pixar_3d", label: "Pixar-Style 3D Animation" },
  { id: "documentary", label: "Hyper-Realistic Documentary" },
  { id: "cyberpunk", label: "Cyberpunk Blade Runner Noir" },
  { id: "anime", label: "Makoto Shinkai Cinematic Anime" },
];

const DEFAULT_PROJECT: VideoProject = {
  title: "The Architecture of Tomorrow",
  aspectRatio: "16:9 Landscape",
  totalDurationSeconds: 30,
  style: "Cinematic Sci-Fi Film (4K Arri)",
  scenes: [
    {
      sceneNumber: 1,
      durationSeconds: 6,
      visualDescription: "Opening wide aerial drone shot sweeping through a futuristic cloud metropolis with glowing levitating transport ribbons at dawn.",
      cameraMovement: "Slow cinematic push-in from high altitude, descending through cloud layers.",
      voiceoverScript: "In a world built on infinite intelligence, the horizon is no longer a limit.",
      audioSfx: "Deep resonant synth pad with ambient wind turbulence."
    },
    {
      sceneNumber: 2,
      durationSeconds: 8,
      visualDescription: "Medium tracking shot following a sleek autonomous drone navigating glass architectural spires reflecting electric magenta sunlight.",
      cameraMovement: "Lateral high-speed tracking shot with dynamic motion blur.",
      voiceoverScript: "Every line of code orchestrates entire cities. Every thought becomes a tangible reality.",
      audioSfx: "High-frequency ion propulsion hum and subtle chime resonance."
    },
    {
      sceneNumber: 3,
      durationSeconds: 8,
      visualDescription: "Close-up macro of an engineer activating a translucent holographic interface that radiates intricate neural network constellations.",
      cameraMovement: "Rack focus from holographic grid to engineer's reflective iris.",
      voiceoverScript: "Power at your fingertips. Driven by GUIDESOFT.",
      audioSfx: "Tactile haptic clicks and rising melodic crescendo."
    },
    {
      sceneNumber: 4,
      durationSeconds: 8,
      visualDescription: "Final hero reveal of the entire cyber-city under starry nebulae with the GUIDESOFT logo shimmering in golden laser light.",
      cameraMovement: "Crane pull-back to epic panoramic establishing view.",
      voiceoverScript: "The future is compiled. Welcome home.",
      audioSfx: "Epic orchestral brass swell ending in clean audio tail."
    }
  ]
};

const VideoGen = () => {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9 Landscape");
  const [style, setStyle] = useState("cinematic_scifi");
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [project, setProject] = useState<VideoProject>(DEFAULT_PROJECT);
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setActiveSceneIdx(0);

    const selectedStyleObj = STYLES.find((s) => s.id === style);
    const systemPrompt = `You are an elite cinematic video director and storyboard producer.
Create a structured video storyboard based on the prompt.
Respond ONLY with a valid JSON object matching this schema:
{
  "title": "Video Title",
  "aspectRatio": "${aspectRatio}",
  "totalDurationSeconds": 30,
  "style": "${selectedStyleObj?.label || "Cinematic"}",
  "scenes": [
    {
      "sceneNumber": 1,
      "durationSeconds": 6,
      "visualDescription": "Detailed visual shot description for AI video generators (Runway, Sora, Kling)",
      "cameraMovement": "Specific camera direction (Drone shot, pan, zoom, dolly)",
      "voiceoverScript": "Narration text",
      "audioSfx": "Sound design and ambient audio cue"
    }
  ]
}`;

    let accumulated = "";

    try {
      await streamChat({
        messages: [{ role: "user", content: `Create video storyboard: ${prompt}` }],
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
            if (Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
              setProject(parsed);
              toast.success(`Storyboard for "${parsed.title || "Video"}" generated!`);
            } else {
              throw new Error("Invalid structure");
            }
          } catch {
            toast.error("Failed to parse storyboard. Try refining prompt.");
          }
        },
      });
    } catch (e: any) {
      setIsGenerating(false);
      toast.error(e.message || "Failed to generate storyboard");
    }
  };

  const handleCopyScript = () => {
    const text = `# ${project.title} (${project.style} - ${project.aspectRatio})\nTotal Duration: ${project.totalDurationSeconds}s\n\n` +
      project.scenes.map((s) => `## Scene ${s.sceneNumber} (${s.durationSeconds}s)
Camera: ${s.cameraMovement}
Visual: ${s.visualDescription}
Voiceover: "${s.voiceoverScript}"
Audio/SFX: ${s.audioSfx}`).join("\n\n---\n\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Full video script copied!");
  };

  const activeScene = project.scenes[activeSceneIdx] || project.scenes[0];

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
        {/* Top Header */}
        <div className="border-b border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-primary-foreground">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">AI Video Storyboard Studio</h1>
                <p className="text-[11px] text-muted-foreground">Synthesize cinematic video scripts, scene storyboards, and camera prompts</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyScript} className="h-8 gap-1.5 text-xs">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy Production Script
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
              placeholder="Describe the video concept, commercial, or short film story..."
              className="flex-1 min-w-[280px] h-9 text-xs"
            />

            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <Film className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Aspect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9 Landscape" className="text-xs">16:9 Landscape (YouTube)</SelectItem>
                <SelectItem value="9:16 Vertical" className="text-xs">9:16 Vertical (Reels/Shorts)</SelectItem>
                <SelectItem value="1:1 Square" className="text-xs">1:1 Square (Instagram)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="w-56 h-9 text-xs">
                <Clapperboard className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-48">
              <ModelSelector value={model} onChange={setModel} />
            </div>

            <Button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} className="h-9 gap-1.5 text-xs">
              {isGenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate Storyboard
            </Button>
          </div>
        </div>

        {/* Storyboard Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Scene Timeline Navigator */}
          <div className="w-72 border-r border-border bg-card/60 p-3 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
              <span>Scenes ({project.scenes.length})</span>
              <span>{project.totalDurationSeconds}s Total</span>
            </div>

            {project.scenes.map((scene, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSceneIdx(idx)}
                className={`w-full rounded-xl border p-3 text-left transition-all ${
                  activeSceneIdx === idx
                    ? "border-foreground bg-accent shadow-sm scale-[1.02]"
                    : "border-border/80 bg-background/50 hover:bg-accent/50 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold mb-1">
                  <span>Scene #{scene.sceneNumber}</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" /> {scene.durationSeconds}s
                  </span>
                </div>
                <p className="text-xs font-semibold truncate text-foreground">{scene.cameraMovement}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{scene.visualDescription}</p>
              </button>
            ))}
          </div>

          {/* Right: Active Scene Storyboard Card */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-muted/10">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h2 className="text-xl font-bold text-foreground">{project.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{project.style} • {project.aspectRatio}</p>
              </div>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold border border-border">
                Scene {activeScene.sceneNumber} of {project.scenes.length}
              </span>
            </div>

            {/* Visual Description Hero Card */}
            <Card className="p-6 border-border bg-card shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                <Camera className="h-4 w-4 text-foreground" />
                <span>Visual Direction & Prompt</span>
              </div>
              <p className="text-sm leading-relaxed text-foreground font-medium bg-muted/20 p-4 rounded-xl border border-border">
                {activeScene.visualDescription}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl border border-border p-3.5 bg-background">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                    <Film className="h-3.5 w-3.5" />
                    <span>Camera Movement</span>
                  </div>
                  <p className="text-xs text-foreground font-mono">{activeScene.cameraMovement}</p>
                </div>

                <div className="rounded-xl border border-border p-3.5 bg-background">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Audio & Sound FX</span>
                  </div>
                  <p className="text-xs text-foreground font-mono">{activeScene.audioSfx}</p>
                </div>
              </div>

              {/* Voiceover Script */}
              <div className="rounded-xl border border-border p-4 bg-accent/40 mt-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1.5">
                  <Mic className="h-3.5 w-3.5" />
                  <span>Voiceover Narration Script</span>
                </div>
                <p className="text-sm italic text-foreground leading-relaxed">
                  "{activeScene.voiceoverScript}"
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default VideoGen;
