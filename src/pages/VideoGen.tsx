import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, Sparkles, Film, Play, Pause, Download,
  Copy, Check, Camera, Mic, Volume2, Clock, RefreshCw, Clapperboard, MicOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import ModelSelector, { type ModelId } from "@/components/ModelSelector";
import { streamChat, startVoiceRecognition } from "@/lib/api";

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

const PRESETS = [
  { label: "🎬 Cyberpunk Teaser", prompt: "A cyberpunk noir trailer following a rogue hacker uncovering a sentient AI mainframe" },
  { label: "🪐 Deep Space Odyssey", prompt: "Interstellar mission crossing an event horizon into a luminous multidimensional nebula" },
  { label: "🏙️ Autonomous Smart City", prompt: "Solarpunk vision of a zero-carbon floating metropolis powered by kinetic architecture" },
  { label: "🌿 Nature Macro Doc", prompt: "David Attenborough style macro documentary exploring the bioluminescent rainforest floor" },
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
  const [isListening, setIsListening] = useState(false);
  const [project, setProject] = useState<VideoProject>(DEFAULT_PROJECT);
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const voiceControllerRef = useRef<{ stop: () => void } | null>(null);

  // Playback timer loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (activeSceneIdx < project.scenes.length - 1) {
          setActiveSceneIdx((prev) => prev + 1);
        } else {
          setIsPlaying(false);
          setActiveSceneIdx(0);
          toast.info("Storyboard playback completed.");
        }
      }, (project.scenes[activeSceneIdx]?.durationSeconds || 4) * 1000);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, activeSceneIdx, project.scenes]);

  const generateWithPrompt = async (targetPrompt: string) => {
    if (!targetPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setIsPlaying(false);
    setActiveSceneIdx(0);

    const selectedStyleObj = STYLES.find((s) => s.id === style);
    const systemPrompt = `You are an elite cinematic video director and storyboard producer.
Create a structured video storyboard based on the prompt.
Respond ONLY with a valid JSON object matching this schema:
{
  "title": "Project Title",
  "aspectRatio": "${aspectRatio}",
  "totalDurationSeconds": 30,
  "style": "${selectedStyleObj?.label || "Cinematic Sci-Fi"}",
  "scenes": [
    {
      "sceneNumber": 1,
      "durationSeconds": 6,
      "visualDescription": "Detailed visual description",
      "cameraMovement": "Camera motion directive",
      "voiceoverScript": "Voiceover audio line",
      "audioSfx": "Sound design and musical cues"
    }
  ]
}`;

    let accumulated = "";

    try {
      await streamChat({
        messages: [{ role: "user", content: `Direct storyboard for: ${targetPrompt}` }],
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
            if (parsed.title && Array.isArray(parsed.scenes)) {
              setProject(parsed);
              toast.success(`Storyboard "${parsed.title}" synthesized!`);
              return;
            }
          } catch {}

          // Fallback parser
          setProject({
            title: targetPrompt,
            aspectRatio,
            totalDurationSeconds: 24,
            style: selectedStyleObj?.label || "Cinematic",
            scenes: [
              {
                sceneNumber: 1,
                durationSeconds: 8,
                visualDescription: `Opening sequence depicting ${targetPrompt}`,
                cameraMovement: "Slow cinematic push-in from wide establishing shot",
                voiceoverScript: `The journey into ${targetPrompt} begins now.`,
                audioSfx: "Deep atmospheric pad and ambient wind",
              },
              {
                sceneNumber: 2,
                durationSeconds: 8,
                visualDescription: "Climactic visual reveal with high-energy lighting and particle physics",
                cameraMovement: "360-degree dynamic camera orbit",
                voiceoverScript: "Innovation at the boundary of reality.",
                audioSfx: "Sub-bass drop and escalating melodic crescendo",
              },
              {
                sceneNumber: 3,
                durationSeconds: 8,
                visualDescription: "Final resolution hero frame with GUIDESOFT branding",
                cameraMovement: "Slow crane zoom-out to black",
                voiceoverScript: "Compiled with GUIDESOFT.",
                audioSfx: "Chime resolution tail",
              },
            ],
          });
          toast.success("Storyboard generated!");
        },
      });
    } catch (e: any) {
      setIsGenerating(false);
      toast.error(e.message || "Failed to generate storyboard");
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      voiceControllerRef.current?.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    toast.info("Listening... Describe your video concept.");

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

  const handleCopyScript = () => {
    const text = `# Storyboard Script: ${project.title}\n\nStyle: ${project.style}\nAspect Ratio: ${project.aspectRatio}\n\n` +
      project.scenes.map(s => `## Scene ${s.sceneNumber} (${s.durationSeconds}s)\n- **Visual:** ${s.visualDescription}\n- **Camera:** ${s.cameraMovement}\n- **Voiceover:** "${s.voiceoverScript}"\n- **Audio:** ${s.audioSfx}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Director script copied to clipboard!");
  };

  const handleDownloadScript = () => {
    const text = `# Storyboard Script: ${project.title}\n\nStyle: ${project.style}\nAspect Ratio: ${project.aspectRatio}\n\n` +
      project.scenes.map(s => `## Scene ${s.sceneNumber} (${s.durationSeconds}s)\n- **Visual:** ${s.visualDescription}\n- **Camera:** ${s.cameraMovement}\n- **Voiceover:** "${s.voiceoverScript}"\n- **Audio:** ${s.audioSfx}`).join('\n\n');
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `storyboard_${project.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Storyboard downloaded!");
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
                <Film className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground font-heading">AI Video Storyboard Studio</h1>
                <p className="text-[11px] text-muted-foreground">Autonomous cinematic direction, shot-by-shot timeline breakdown, and voiceover scripting</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="h-8 w-56 text-xs rounded-xl">
                  <SelectValue placeholder="Cinematic Style" />
                </SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleCopyScript} className="h-8 gap-1.5 text-xs rounded-xl">
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />} Copy Script
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadScript} className="h-8 gap-1.5 text-xs rounded-xl">
                <Download className="h-3.5 w-3.5" /> Export .md
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px]">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") generateWithPrompt(prompt); }}
                placeholder="Describe your video or commercial concept (e.g. Cyberpunk Film Teaser, Solarpunk City, Deep Space)..."
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

            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="h-9 w-36 text-xs rounded-xl">
                <SelectValue placeholder="Ratio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9 Landscape">16:9 Landscape</SelectItem>
                <SelectItem value="9:16 Vertical Reel">9:16 Vertical Reel</SelectItem>
                <SelectItem value="2.39:1 Anamorphic">2.39:1 Anamorphic</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-48">
              <ModelSelector value={model} onChange={setModel} disabled={isGenerating} />
            </div>

            <Button
              onClick={() => generateWithPrompt(prompt)}
              disabled={!prompt.trim() || isGenerating}
              className="h-9 gap-1.5 text-xs rounded-xl shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" /> {isGenerating ? "Directing..." : "Generate Storyboard"}
            </Button>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase flex-shrink-0">Starter Prompts:</span>
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

        {/* Storyboard Viewport */}
        <div className="grid flex-1 grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left: Interactive Timeline & Scene List */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-border bg-card/40 p-4 sm:p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground font-heading">{project.title}</h2>
                <p className="text-[11px] text-muted-foreground">{project.style} • {project.scenes.length} Scenes</p>
              </div>
              <Button
                variant={isPlaying ? "destructive" : "default"}
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className="h-8 gap-1.5 text-xs rounded-xl shadow-sm"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isPlaying ? "Pause Player" : "Play Storyboard"}
              </Button>
            </div>

            <div className="space-y-2.5">
              {project.scenes.map((scene, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setIsPlaying(false);
                    setActiveSceneIdx(idx);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    activeSceneIdx === idx
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-foreground font-heading">Scene #{scene.sceneNumber}</span>
                    <span className="text-[11px] font-mono text-muted-foreground bg-accent px-2 py-0.5 rounded-md">
                      {scene.durationSeconds}s
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {scene.visualDescription}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Active Scene Director Details Canvas */}
          <div className="lg:col-span-7 flex flex-col p-4 sm:p-8 overflow-y-auto bg-muted/10 justify-between">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSceneIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Visual Viewport Card */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <Clapperboard className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Scene #{activeScene.sceneNumber} Production Breakdown
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-primary">
                      {activeScene.durationSeconds} Seconds
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Visual Cinematography</h3>
                    <p className="text-sm sm:text-base leading-relaxed text-foreground font-medium">
                      {activeScene.visualDescription}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="rounded-xl bg-accent/60 p-3.5 border border-border/50">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
                        <Camera className="h-3.5 w-3.5 text-primary" /> Camera Movement
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{activeScene.cameraMovement}</p>
                    </div>

                    <div className="rounded-xl bg-accent/60 p-3.5 border border-border/50">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
                        <Volume2 className="h-3.5 w-3.5 text-primary" /> Audio & Sound FX
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{activeScene.audioSfx}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
                      <Mic className="h-3.5 w-3.5 text-primary" /> Voiceover Narration
                    </div>
                    <p className="text-xs sm:text-sm italic text-foreground leading-relaxed">
                      "{activeScene.voiceoverScript}"
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Bottom Timeline Progress */}
            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Scene {activeSceneIdx + 1} of {project.scenes.length}</span>
              <div className="flex items-center gap-1.5">
                {project.scenes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setIsPlaying(false); setActiveSceneIdx(i); }}
                    className={`h-2 rounded-full transition-all ${
                      activeSceneIdx === i ? "w-8 bg-primary" : "w-2 bg-border hover:bg-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              <span>Total: {project.totalDurationSeconds}s</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default VideoGen;
