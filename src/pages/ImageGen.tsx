import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Image as ImageIcon, Loader2, Download, Wand2, Sparkles, Mic, MicOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateImage, startVoiceRecognition } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { incrementImageCount } from "@/hooks/useConversations";

const IMAGE_MODELS = [
  { id: "google/gemini-3-pro-image-preview", label: "Gemini Image (Google)" },
  { id: "openai/dall-e-3", label: "DALL-E 3 (OpenAI)" },
  { id: "openai/dall-e-2", label: "DALL-E 2 (OpenAI)" },
];

const STYLES = [
  { id: "photorealistic", label: "Photorealistic 8K" },
  { id: "digital art", label: "Digital Art & CGI" },
  { id: "watercolor painting", label: "Watercolor Fine Art" },
  { id: "cyberpunk", label: "Cyberpunk Neon" },
  { id: "anime style", label: "Anime Makoto Shinkai" },
  { id: "oil painting", label: "Classic Oil Painting" },
];

const PRESETS = [
  "A futuristic cyberpunk cityscape at sunset with holographic transport ribbons",
  "A cozy glass cabin nestled in the snow-covered Swiss Alps during aurora borealis",
  "An abstract geometric iris reflecting quantum neural networks in iridescent colors",
  "A minimalist 3D studio render of a luxury architectural chair on pastel sand",
  "A tranquil Japanese zen garden with ancient bonsai trees and reflecting water pond",
];

const ImageGen = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [prompt, setPrompt] = useState(initialQuery);
  const [style, setStyle] = useState("photorealistic");
  const [model, setModel] = useState("google/gemini-3-pro-image-preview");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const voiceControllerRef = useRef<{ stop: () => void } | null>(null);

  const generateWithPrompt = async (targetPrompt: string) => {
    if (!targetPrompt.trim() || isLoading) return;
    setIsLoading(true);
    setImageUrl(null);
    setErrorMsg(null);

    const fullPrompt = style ? `${targetPrompt.trim()}, ${style} style` : targetPrompt.trim();

    try {
      const result = await generateImage({ prompt: fullPrompt, model });

      if (result.status === "completed" && result.image_url) {
        setImageUrl(result.image_url);
        incrementImageCount();
        toast.success("Artwork synthesized!");
      } else {
        const msg = result.error || "Could not generate image. Try a more descriptive prompt.";
        setErrorMsg(msg);
        toast.error(msg);
      }
    } catch (e: any) {
      const msg = e.message || "Failed to generate image";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = () => {
    generateWithPrompt(prompt);
  };

  const handlePresetClick = (presetPrompt: string) => {
    setPrompt(presetPrompt);
    generateWithPrompt(presetPrompt);
  };

  useEffect(() => {
    if (initialQuery) generateWithPrompt(initialQuery);
  }, []);

  const toggleVoice = () => {
    if (isListening) {
      voiceControllerRef.current?.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    toast.info("Listening... Describe the artwork you envision.");

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

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `guidesoft_art_${Date.now()}.png`;
    a.click();
    toast.success("Image download initiated!");
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-primary-foreground">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground font-heading">AI Image Generator</h1>
                  <p className="text-xs text-muted-foreground">Synthesize high-definition artwork, concepts, and photorealistic assets</p>
                </div>
              </div>
            </motion.div>

            {/* Input area */}
            <div className="mb-4 rounded-2xl border border-border bg-card p-4 search-shadow">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  placeholder={isListening ? "Listening to your voice prompt..." : "Describe an image in detail (e.g. Cyberpunk cityscape at sunset with flying cars)..."}
                  className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none pr-10"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`absolute right-1 top-1 p-2 rounded-xl transition-colors ${
                    isListening ? "bg-red-500 text-white animate-pulse" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Voice Dictation"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger className="h-8 w-40 text-xs rounded-xl">
                      <SelectValue placeholder="Style" />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLES.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="h-8 w-48 text-xs rounded-xl">
                      <SelectValue placeholder="Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_MODELS.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isLoading}
                  size="sm"
                  className="h-8 gap-1.5 text-xs rounded-xl shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-3.5 w-3.5" /> Generate Artwork
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Starter Presets */}
            <div className="mb-6 flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase flex-shrink-0">Inspirations:</span>
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handlePresetClick(p)}
                  className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all flex-shrink-0"
                >
                  {p.slice(0, 32)}...
                </button>
              ))}
            </div>

            {/* Output Viewport */}
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-primary-foreground shadow-md">
                  <Sparkles className="h-7 w-7 animate-pulse" />
                </div>
                <h3 className="text-sm font-bold text-foreground font-heading">Synthesizing Creative Canvas</h3>
                <p className="mt-1 text-xs text-muted-foreground">Applying lighting, depth maps, and aesthetic filters...</p>
              </motion.div>
            )}

            {imageUrl && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-border bg-card p-4 shadow-lg space-y-4">
                <div className="relative overflow-hidden rounded-xl bg-muted/40 aspect-square max-h-[500px] flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt={prompt}
                    className="h-full w-full object-contain rounded-xl"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground italic truncate max-w-[80%]">"{prompt}"</p>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 gap-1.5 text-xs rounded-xl">
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                </div>
              </motion.div>
            )}

            {errorMsg && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-500">
                {errorMsg}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ImageGen;
