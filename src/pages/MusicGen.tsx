import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Music, Sparkles, Play, Pause, Download, Copy,
  Check, Volume2, Radio, Disc, RefreshCw, Sliders
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import ModelSelector, { type ModelId } from "@/components/ModelSelector";
import { streamChat } from "@/lib/api";

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
  const [track, setTrack] = useState(DEFAULT_TRACK);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const currentChordIdx = useRef(0);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      stopSynthesizer();
    };
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    stopSynthesizer();

    const selectedGenreObj = GENRES.find((g) => g.id === genre);
    const systemPrompt = `You are an expert music producer and lyricist.
Based on the prompt, generate a track with title, musical key, chord progression (using standard names like Am, C, F, G, Dm, Em), and full structured lyrics with [Verse], [Chorus], [Bridge], [Outro] markers.
Respond ONLY with a valid JSON object matching this schema:
{
  "title": "Song Title",
  "genre": "${selectedGenreObj?.label || "Synthwave"}",
  "bpm": ${bpm},
  "key": "Am",
  "chords": ["Am", "F", "C", "G"],
  "lyrics": "[Verse 1]\\nLines...\\n\\n[Chorus]\\nLines..."
}`;

    let accumulated = "";

    try {
      await streamChat({
        messages: [{ role: "user", content: `Compose a ${selectedGenreObj?.label} song about: ${prompt}` }],
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
              setTrack(parsed);
              toast.success(`Track "${parsed.title}" composed!`);
            } else {
              throw new Error("Invalid format");
            }
          } catch {
            setTrack({
              ...DEFAULT_TRACK,
              title: prompt,
              lyrics: accumulated,
            });
            toast.info("Lyrics compiled.");
          }
        },
      });
    } catch (e: any) {
      setIsGenerating(false);
      toast.error(e.message || "Failed to generate track");
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
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + chordDuration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + chordDuration);
        });

        currentChordIdx.current += 1;
      };

      playChord();
      intervalRef.current = window.setInterval(playChord, chordDuration * 1000);
      toast.success("Synthesizer playback started!");
    } catch {
      toast.error("Web Audio playback not supported in this browser.");
    }
  };

  const stopSynthesizer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleCopy = () => {
    const text = `Title: ${track.title}\nGenre: ${track.genre}\nBPM: ${track.bpm} | Key: ${track.key}\nChords: ${track.chords.join(" - ")}\n\n${track.lyrics}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Track copied to clipboard!");
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
                <h1 className="text-base font-bold text-foreground">AI Music & Audio Synthesizer</h1>
                <p className="text-[11px] text-muted-foreground">Generate lyrics, chord progressions, song structure, and live Web Audio synthesis</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 gap-1.5 text-xs">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy Track
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
              placeholder="Describe song theme, vibe, or story (e.g. Midnight highway drive, AI waking up)..."
              className="flex-1 min-w-[280px] h-9 text-xs"
            />

            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="w-52 h-9 text-xs">
                <Radio className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                {GENRES.map((g) => (
                  <SelectItem key={g.id} value={g.id} className="text-xs">{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-48">
              <ModelSelector value={model} onChange={setModel} />
            </div>

            <Button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} className="h-9 gap-1.5 text-xs">
              {isGenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Compose Track
            </Button>
          </div>
        </div>

        {/* Music Studio Canvas */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Lyrics & Arrangement */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-muted/10">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h2 className="text-xl font-bold text-foreground">{track.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold text-foreground border border-border">
                    {track.genre}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {track.bpm} BPM • Key: {track.key}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <pre className="font-sans text-xs sm:text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {track.lyrics}
              </pre>
            </div>
          </div>

          {/* Right: Synthesizer & Chord Player */}
          <div className="w-80 border-l border-border bg-card p-5 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Disc className={`h-5 w-5 ${isPlaying ? "animate-spin text-primary" : "text-muted-foreground"}`} />
                <h3 className="text-sm font-semibold text-foreground">Interactive Synthesizer</h3>
              </div>

              {/* Chord Progression Display */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">
                  Chord Progression
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {track.chords?.map((chord, idx) => (
                    <div
                      key={idx}
                      className={`h-12 rounded-xl border flex flex-col items-center justify-center font-mono text-sm font-bold transition-all ${
                        isPlaying && (currentChordIdx.current % track.chords.length) === idx
                          ? "border-foreground bg-accent text-foreground scale-105 shadow-md"
                          : "border-border bg-background text-foreground"
                      }`}
                    >
                      <span>{chord}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Waveform Visualization Bars */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">
                  Harmonic Visualizer
                </label>
                <div className="h-16 rounded-xl border border-border bg-background flex items-end justify-center gap-1.5 p-3 overflow-hidden">
                  {[40, 75, 55, 90, 65, 80, 45, 95, 70, 60, 85, 50].map((height, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: isPlaying ? [`${height * 0.3}%`, `${height}%`, `${height * 0.5}%`] : "15%",
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.4 + (i % 4) * 0.1,
                        ease: "easeInOut",
                      }}
                      className="w-2 rounded-full bg-foreground"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Synthesizer Trigger Button */}
            <div className="pt-4 border-t border-border">
              <Button
                onClick={playSynthesizer}
                className="w-full h-11 gap-2 text-sm font-semibold rounded-xl"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? "Pause Synth Preview" : "Play Synth Chords"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MusicGen;
