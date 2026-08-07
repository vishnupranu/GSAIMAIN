import { useRef } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import ModelSelector from "./ModelSelector";
import type { ModelId } from "./ModelSelector";

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  model: ModelId;
  setModel: (m: ModelId) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
}

const ChatInput = ({ input, setInput, isLoading, model, setModel, onSubmit, onStop }: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      <form onSubmit={onSubmit} className="mx-auto flex max-w-3xl flex-col gap-2">
        <div className="flex items-center gap-2">
          <ModelSelector value={model} onChange={setModel} disabled={isLoading} />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1 rounded-2xl border border-border bg-card p-3 search-shadow">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              rows={1}
              style={{ maxHeight: "120px" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
            />
          </div>
          {isLoading ? (
            <Button type="button" size="icon" variant="outline" onClick={onStop} className="h-10 w-10 rounded-xl flex-shrink-0">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()} className="h-10 w-10 rounded-xl flex-shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-center text-[10px] text-muted-foreground">
          Genspark AI may produce inaccurate information. Verify important facts.
        </p>
      </form>
    </div>
  );
};

export default ChatInput;
