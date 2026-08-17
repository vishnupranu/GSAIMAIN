import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Music, Sparkles, Play, Pause, Download, Copy,
  Check, Volume2, Radio, Disc, RefreshCw, Sliders, Mic, MicOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import ModelSelector, { type ModelId } from "@/components/ModelSelector";
import { streamChat, startVoiceRecognition } from "@/lib/api";

const GENRES = [
  { id: "synthwave", label: "80s Retro Synthwave", defaultBpm: 120 },
  { id: "lofi", label: "Lo-Fi Study Chillhop", defaultBpm: 85 },
  { id: "cyberpunk", label: "Cyberpunk Industrial EDM", defaultBpm: 130 },
  { id: "ambient", label: "Cinematic Ambient Piano", defaultBpm: 75 },
  { id: "pop", label: "Modern Electronic Pop", defaultBpm: 118 },
  { id: "orchestral", label: "Epic Cinematic Orchestral", defaultBpm: 90 },
];

const CHORD_FREQS: Record<string, number[]> = {
  C: [261.63, 329.63, 392.0],
  Dm: [293.66, 349.23, 440.0],
  Em: [329.63, 392.0, 493.88],
  F: [349.23, 440.0, 523.25],
  G: [392.0, 493.88, 587.33],
  Am: [440.0, 523.25, 659.25],
  Bb: [466.16, 587.33, 698.46],
  D: [293.66, 369.99, 440.0],
  A: [440.0, 554.37, 659.25],
  E: [329.63, 415.3, 493.88],
};

const PRESETS = [
  { label: "⚡ Neon Cyberpunk", prompt: "High-energy synthwave anthem about racing through a neon metropolis at midnight", genre: "synthwave", bpm: 124 },
  { label: "☕ Lo-Fi Chill", prompt: "Relaxing lo-fi study beat with gentle rain outside the coffee shop window", genre: "lofi", bpm: 85 },
  { label: "🎹 Ambient Piano", prompt: "Peaceful cinematic ambient piano track reflecting under starry midnight skies", genre: "ambient", bpm: 72 },
  { label: "✨ Modern Pop", prompt: "Uplifting futuristic electronic pop track celebrating human ingenuity and technology", genre: "pop", bpm: 120 },
];

const DEFAULT_TRACK = {
  title: "Neon Horizon 2026",
  genre: "80s Retro Synthwave",
  bpm: 120,
  key: "Am",
  chords: ["Am", "F", "C", "G"],
  lyrics: `[Intro - Arpeggiated Synth]
(Pulsing bassline rises through the digital fog)

[Verse 1]
Midnight skyline painted neon blue
Racing through the circuits straight to you
Data streams across the velvet night
Chasing down the speed of guided light

[Chorus]
We are electric, running free
Lost in the rhythm of eternity
Hold on to the signal, never let it fade
In the synthetic dream we made

[Outro]
Fading into the grid...
Neon horizon.`,
};

const MusicGen = () => {
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("synthwave");
  const [bpm, setBpm] = useState(120);
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [track, setTrack] = useState(DEFAULT_TRACK);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const currentChordIdx = useRef(0);
  const voiceControllerRef = useRef<{ stop: () => void } | null>(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      stopSynthesizer();
    };
  }, []);

  const generateWithPrompt = async (targetPrompt: string, targetGenre = genre, targetBpm = bpm) => {
    if (!targetPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    stopSynthesizer();

    const selectedGenreObj = GENRES.find((g) => g.id === targetGenre);
    const systemPrompt = `You are an expert music producer and lyricist.
Based on the prompt, generate a track with title, musical key, chord progression (using standard names like Am, C, F, G, Dm, Em), and full structured lyrics with [Verse], [Chorus], [Bridge], [Outro] markers.
Respond ONLY with a valid JSON object matching this schema:
{
  "title": "Song Title",
  "genre": "${selectedGenreObj?.label || "Synthwave"}",
  "bpm": ${targetBpm},
  "key": "Am",
  "chords": ["Am", "F", "C", "G"],
  "lyrics": "[Verse 1]\\nLines...\\n\\n[Chorus]\\nLines..."
}`;

    let accumulated = "";

    try {
      await streamChat({
        messages: [{ role: "user", content: `Compose a ${selectedGenreObj?.label} song about: ${targetPrompt}` }],
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
            if (parsed.title && parsed.lyrics) {
              setTrack({
                ...parsed,
                chords: Array.isArray(parsed.chords) && parsed.chords.length > 0 ? parsed.chords : ["Am", "F", "C", "G"],
              });
              toast.success(`Track "${parsed.title}" composed!`);
              return;
            }
          } catch {}

          setTrack({
            ...DEFAULT_TRACK,
            title: targetPrompt.slice(0, 30),
            lyrics: accumulated || DEFAULT_TRACK.lyrics,
          });
          toast.success("Lyrics compiled.");
        },
      });
    } catch (e: any) {
      setIsGenerating(false);
      toast.error(e.message || "Failed to generate track");
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      voiceControllerRef.current?.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    toast.info("Listening... Describe your song style and theme.");

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

  const playSynthesizer = () => {
    if (isPlaying) {
      stopSynthesizer();
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;
      setIsPlaying(true);

      const chords = track.chords && track.chords.length > 0 ? track.chords : ["Am", "F", "C", "G"];
      const chordDuration = (60 / track.bpm) * 2; // 2 beats per chord

      const playChord = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") return;
        const chordName = chords[currentChordIdx.current % chords.length];
        const freqs = CHORD_FREQS[chordName] || CHORD_FREQS["Am"];

        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = i === 0 ? "sawtooth" : "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime);

          // Envelope
          gain.gain.setValueAtTime(0.01, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.15 / freqs.length, ctx.currentTime + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + chordDuration - 0.05);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + chordDuration);
        });

        currentChordIdx.current = (currentChordIdx.current + 1) % chords.length;
      };

      // Play first chord immediately
      playChord();
      const intervalId = window.setInterval(playChord, chordDuration * 1000);
      intervalRef.current = intervalId;
      toast.success("Playing synthesizer chord progression...");
    } catch {
      toast.error("Web Audio API not supported on this browser.");
      setIsPlaying(false);
    }
  };

  const stopSynthesizer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleCopyLyrics = () => {
    const text = `# ${track.title} (${track.genre})\nKey: ${track.key} | BPM: ${track.bpm}\nChords: ${track.chords.join(" - ")}\n\n${track.lyrics}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Track lyrics copied to clipboard!");
  };

  const handleDownloadTrack = () => {
    const text = `# ${track.title} (${track.genre})\nKey: ${track.key} | BPM: ${track.bpm}\nChords: ${track.chords.join(" - ")}\n\n${track.lyrics}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guidesoft_track_${track.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Track structure downloaded!");
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
        {/* Top Header */}
        <div className="border-b border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-primary-foreground">
                <Music className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground font-heading">AI Music & Audio Synthesizer</h1>
                <p className="text-[11px] text-muted-foreground">Generate lyrics, chord progressions, song structures, and synthesize live Web Audio playback</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={isPlaying ? "destructive" : "default"}
                size="sm"
                onClick={playSynthesizer}
                className="h-8 gap-1.5 text-xs rounded-xl shadow-sm"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isPlaying ? "Stop Synthesizer" : "Play Synth Chords"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyLyrics} className="h-8 gap-1.5 text-xs rounded-xl">
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />} Copy Lyrics
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadTrack} className="h-8 gap-1.5 text-xs rounded-xl">
                <Download className="h-3.5 w-3.5" /> Export Track
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px]">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") generateWithPrompt(prompt); }}
                placeholder="Describe your track mood, lyrics theme, and tempo (e.g. Cyberpunk Synthwave, Lo-Fi Chillhop)..."
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

            <Select value={genre} onValueChange={(val) => {
              setGenre(val);
              const g = GENRES.find((x) => x.id === val);
              if (g) setBpm(g.defaultBpm);
            }}>
              <SelectTrigger className="h-9 w-44 text-xs rounded-xl">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                {GENRES.map((g) => (
                  <SelectItem key={g.id} value={g.id} className="text-xs">
                    {g.label}
                  </SelectItem>
                ))}
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
              <Sparkles className="h-3.5 w-3.5" /> {isGenerating ? "Composing..." : "Compose Track"}
            </Button>
          </div>

          {/* Quick interactive presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase flex-shrink-0">Starter Tracks:</span>
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  setPrompt(p.prompt);
                  setGenre(p.genre);
                  setBpm(p.bpm);
                  generateWithPrompt(p.prompt, p.genre, p.bpm);
                }}
                className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all flex-shrink-0"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Music Studio Dashboard */}
        <div className="grid flex-1 grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Audio Console (5 cols) */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-border bg-card/40 p-4 sm:p-6 overflow-y-auto space-y-6">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Disc className={`h-5 w-5 ${isPlaying ? "text-primary animate-spin" : "text-muted-foreground"}`} />
                  <h3 className="text-sm font-bold text-foreground font-heading">{track.title}</h3>
                </div>
                <span className="rounded-full bg-accent border border-border px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                  {track.genre}
                </span>
              </div>

              {/* Chord Progression Display */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">
                  Chord Progression
                </label>
                <div className="flex items-center gap-2">
                  {track.chords.map((chord, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 rounded-xl border p-3 text-center transition-all ${
                        isPlaying && currentChordIdx.current % track.chords.length === idx
                          ? "border-primary bg-primary text-primary-foreground font-bold shadow-md scale-105"
                          : "border-border bg-background text-foreground font-semibold"
                      }`}
                    >
                      <span className="text-sm sm:text-base font-mono">{chord}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Track Metadata & Tempo Slider */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tempo (BPM): <strong className="text-foreground">{bpm}</strong></span>
                  <span className="text-muted-foreground">Key Signature: <strong className="text-foreground">{track.key}</strong></span>
                </div>
                <Slider
                  value={[bpm]}
                  min={60}
                  max={180}
                  step={1}
                  onValueChange={(val) => setBpm(val[0])}
                  className="w-full"
                />
              </div>
            </div>

            {/* Synthesizer Waveform Visualizer simulation */}
            <div className="rounded-2xl border border-border bg-slate-950 p-5 shadow-sm text-center space-y-3">
              <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400">
                {isPlaying ? "SYNTHESIZER OSCILLATOR ACTIVE • 44.1kHz" : "SYNTHESIZER STANDBY"}
              </span>
              <div className="flex items-center justify-center gap-1.5 h-16">
                {[40, 65, 30, 85, 50, 95, 70, 45, 80, 60, 35, 90, 55, 75, 45].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: isPlaying ? `${Math.max(15, (h * (i % 3 + 1)) % 100)}%` : "20%" }}
                    className={`w-1.5 rounded-full transition-all duration-150 ${
                      isPlaying ? "bg-emerald-400 shadow-sm shadow-emerald-500/50" : "bg-slate-800"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Lyrics Viewport (7 cols) */}
          <div className="lg:col-span-7 flex flex-col p-4 sm:p-6 overflow-y-auto bg-muted/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Song Lyrics & Structure</span>
              <span className="text-xs font-mono text-muted-foreground">{track.lyrics.split("\n").length} lines</span>
            </div>

            <div className="flex-1 rounded-2xl border border-border bg-card p-6 shadow-sm overflow-y-auto">
              <pre className="font-sans text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {track.lyrics}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MusicGen;
