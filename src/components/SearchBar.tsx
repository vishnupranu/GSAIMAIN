import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Paperclip, Mic, MicOff, CornerDownLeft, Sparkles, X, FileText, Bot, Presentation, Code2 } from "lucide-react";
import { toast } from "sonner";
import { startVoiceRecognition } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceControllerRef = useRef<{ stop: () => void } | null>(null);

  const handleSubmit = () => {
    if (!query.trim() && !attachment) return;
    const finalPrompt = attachment ? `[Attachment: ${attachment}] ${query.trim()}` : query.trim();
    navigate(`/chat?q=${encodeURIComponent(finalPrompt)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      voiceControllerRef.current?.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    toast.info("Listening... Speak your prompt clearly.");

    const controller = startVoiceRecognition({
      onResult: (transcript) => {
        setQuery(transcript);
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

  return (
    <div className="mx-auto w-full max-w-2xl">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept=".txt,.md,.json,.pdf,.png,.jpg,.jpeg,.csv"
      />

      <div className="search-shadow rounded-2xl border border-border/80 bg-card p-4 transition-all hover:border-border hover:shadow-lg">
        {attachment && (
          <div className="mb-2 flex items-center justify-between rounded-xl bg-accent/60 px-3 py-1.5 text-xs text-foreground">
            <div className="flex items-center gap-2 truncate">
              <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="truncate font-medium">{attachment}</span>
            </div>
            <button
              onClick={() => setAttachment(null)}
              className="ml-2 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Listening to your voice..." : "Ask anything, create anything across all 12 AI studios..."}
          className="w-full resize-none bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          rows={2}
        />

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="Quick Actions"
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 rounded-xl">
                <DropdownMenuItem onClick={() => navigate("/chat")} className="gap-2 text-xs">
                  <Sparkles className="h-3.5 w-3.5" /> New AI Chat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/slides")} className="gap-2 text-xs">
                  <Presentation className="h-3.5 w-3.5" /> AI Presentation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/code")} className="gap-2 text-xs">
                  <Code2 className="h-3.5 w-3.5" /> AI Developer Code
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/custom-agent")} className="gap-2 text-xs">
                  <Bot className="h-3.5 w-3.5" /> Build Custom Agent
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach Document or Image"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={toggleVoice}
              title={isListening ? "Stop listening" : "Voice Dictation"}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                isListening
                  ? "bg-red-500 text-white animate-pulse shadow-md"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!query.trim() && !attachment}
              title="Execute Prompt"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground text-background transition-all hover:opacity-90 disabled:opacity-30"
            >
              <CornerDownLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1 font-medium text-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Autonomous Intelligence
        </span>
        <span>•</span>
        <span>12 Creative Studios</span>
        <span>•</span>
        <span>Local & Multi-Model Routing</span>
      </div>
    </div>
  );
};

export default SearchBar;
