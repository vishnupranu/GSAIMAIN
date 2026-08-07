import { useState } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";

const ImageGen = () => {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generate = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    setImageUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt },
      });

      if (error) throw new Error(error.message || "Image generation failed");
      if (data?.imageUrl) {
        setImageUrl(data.imageUrl);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate image");
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "A futuristic city skyline at sunset with flying cars",
    "A cozy cabin in the mountains during winter",
    "An abstract painting of the cosmos in vibrant colors",
    "A cute robot reading a book in a library",
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

            <div className="mb-4 rounded-2xl border border-border bg-card p-4 search-shadow">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to create..."
                className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) generate(); }}
              />
              <div className="mt-3 flex justify-end">
                <Button size="sm" onClick={generate} disabled={!prompt.trim() || isLoading} className="gap-1.5">
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  Generate
                </Button>
              </div>
            </div>

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

            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Creating your image...</p>
              </motion.div>
            )}

            {imageUrl && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-border bg-card p-2 overflow-hidden">
                <img src={imageUrl} alt={prompt} className="w-full rounded-xl" />
                <div className="mt-2 flex justify-end p-2">
                  <Button variant="outline" size="sm" asChild className="gap-1.5">
                    <a href={imageUrl} download target="_blank" rel="noopener noreferrer">
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
