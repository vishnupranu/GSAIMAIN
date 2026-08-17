import { useRef, useState } from "react";
import { Send, Square, Mic, MicOff, Paperclip, Sparkles, X, FileText, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ModelSelector from "./ModelSelector";
import type { ModelId } from "./ModelSelector";
import { startVoiceRecognition } from "@/lib/api";

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  model: ModelId;
  setModel: (m: ModelId) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
  webSearchEnabled?: boolean;
  onToggleWebSearch?: () => void;
}

const ChatInput = ({
  input,
  setInput,
  isLoading,
  model,
  setModel,
  onSubmit,
  onStop,
  webSearchEnabled = false,
  onToggleWebSearch,
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const voiceControllerRef = useRef<{ stop: () => void } | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      voiceControllerRef.current?.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    toast.info("Listening... Speak your message.");

    const controller = startVoiceRecognition({
      onResult: (transcript) => {
        setInput(transcript);
      },
      onError: (err) => {
        toast.error(`Microphone error: ${err}`);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10MB limit");
      return;
    }

    setAttachment(file.name);
    toast.success(`Attached ${file.name}`);
  };

  const enhancePrompt = () => {
    if (!input.trim()) {
      toast.info("Type a prompt first to enhance it");
      return;
    }
    const enhanced = `Provide a comprehensive, high-depth analysis and production-ready solution with clear architectural steps for: "${input.trim()}". Include edge cases, metrics, and structured code if applicable.`;
    setInput(enhanced);
    toast.success("Prompt optimized with technical rigor!");
  };

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept=".txt,.md,.json,.pdf,.png,.jpg,.jpeg,.csv"
      />

      <form onSubmit={onSubmit} className="mx-auto flex max-w-3xl flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ModelSelector value={model} onChange={setModel} disabled={isLoading} />
            {onToggleWebSearch && (
              <Button
                type="button"
                variant={webSearchEnabled ? "default" : "outline"}
                size="sm"
                onClick={onToggleWebSearch}
                className="h-8 gap-1.5 text-xs rounded-xl"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Web Search</span>
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={enhancePrompt}
            disabled={!input.trim()}
            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Enhance Prompt
          </Button>
        </div>

        {attachment && (
          <div className="flex items-center justify-between rounded-xl bg-accent/70 px-3 py-1.5 text-xs text-foreground">
            <div className="flex items-center gap-2 truncate">
              <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="truncate font-medium">{attachment}</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="ml-2 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 rounded-2xl border border-border bg-card p-3 search-shadow transition-all focus-within:border-primary/50">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening to your voice..." : "Type your prompt or speak via microphone..."}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              rows={1}
              style={{ maxHeight: "140px" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 140) + "px";
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={toggleVoice}
            title={isListening ? "Stop voice dictation" : "Voice Dictation"}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border border-border transition-all flex-shrink-0 ${
              isListening
                ? "bg-red-500 text-white border-red-600 animate-pulse shadow-md"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          {isLoading ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={onStop}
              className="h-10 w-10 rounded-xl flex-shrink-0"
            >
              <Square className="h-4 w-4 text-red-500" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() && !attachment}
              className="h-10 w-10 rounded-xl flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          GUIDESOFT AI operates with local & multi-model intelligence. Verify critical facts.
        </p>
      </form>
    </div>
  );
};

export default ChatInput;
