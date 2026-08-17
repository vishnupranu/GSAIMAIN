import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Image as ImageIcon, Loader2, Download, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateImage } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { incrementImageCount } from "@/hooks/useConversations";

const IMAGE_MODELS = [
  { id: "google/gemini-3-pro-image-preview", label: "Gemini Image (Google)" },
  { id: "openai/dall-e-3", label: "DALL-E 3 (OpenAI)" },
  { id: "openai/dall-e-2", label: "DALL-E 2 (OpenAI)" },
];

const STYLES = [
  { id: "photorealistic", label: "Photorealistic" },
  { id: "digital art", label: "Digital Art" },
  { id: "watercolor painting", label: "Watercolor" },
  { id: "pencil sketch", label: "Sketch" },
  { id: "anime style", label: "Anime" },
  { id: "oil painting", label: "Oil Painting" },
];

const ImageGen = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [prompt, setPrompt] = useState(initialQuery);
  const [style, setStyle] = useState("photorealistic");
  const [model, setModel] = useState("google/gemini-3-pro-image-preview");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-generate if ?q= param is set (from Agents page)
  useEffect(() => {
    if (initialQuery) generate();
  }, []);

  const generate = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    setImageUrl(null);
    setErrorMsg(null);

    const fullPrompt = style
      ? `${prompt.trim()}, ${style} style`
      : prompt.trim();

    try {
      const result = await generateImage({ prompt: fullPrompt, model });

      if (result.status === "completed" && result.image_url) {
        setImageUrl(result.image_url);
        incrementImageCount();
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

  const suggestions = [
    "A futuristic city skyline at sunset with flying cars",
    "A cozy cabin in the mountains during winter",
    "An abstract painting of the cosmos in vibrant colors",
    "A cute robot reading a book in a library",
    "A serene Japanese zen garden with cherry blossoms",
    "An astronaut exploring an alien planet",
  ];

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground">
                  <ImageIcon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">AI Image Generator</h1>
                  <p className="text-xs text-muted-foreground">Describe an image and let AI create it for you</p>
                </div>
              </div>
            </motion.div>

            {/* Input area */}
            <div className="mb-4 rounded-2xl border border-border bg-card p-4 search-shadow">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to create..."
                className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                rows={3}
                onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) generate(); }}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2 justify-between">
                <div className="flex gap-2">
                  {/* Style selector */}
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger className="h-8 w-auto text-xs border-border bg-background">
                      <Wand2 className="h-3 w-3 mr-1 text-muted-foreground" />
                      <SelectValue placeholder="Style" />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLES.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Model selector */}
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="h-8 w-auto text-xs border-border bg-background">
                      <SelectValue placeholder="Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_MODELS.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button size="sm" onClick={generate} disabled={!prompt.trim() || isLoading} className="gap-1.5">
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  Generate
                </Button>
              </div>
            </div>

            {/* Suggestions */}
            {!imageUrl && !isLoading && (
              <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {suggestions.map((s, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    onClick={() => setPrompt(s)}
                    className="rounded-xl border border-border bg-card p-3 text-left text-xs text-foreground transition-colors hover:bg-accent"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Creating your image...</p>
                <p className="text-xs text-muted-foreground/60">This may take 10–30 seconds</p>
              </motion.div>
            )}

            {/* Error */}
            {errorMsg && !isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {errorMsg}
              </motion.div>
            )}

            {/* Result */}
            {imageUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-border bg-card p-2 overflow-hidden"
              >
                <img src={imageUrl} alt={prompt} className="w-full rounded-xl" />
                <div className="mt-2 flex items-center justify-between p-2">
                  <p className="text-xs text-muted-foreground truncate max-w-[70%]">{prompt}</p>
                  <Button variant="outline" size="sm" asChild className="gap-1.5 flex-shrink-0">
                    <a href={imageUrl} download="guidesoft-image.png" target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ImageGen;
