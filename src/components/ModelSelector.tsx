import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";

export const AI_MODELS = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", provider: "Google", speed: "Fast" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google", speed: "Fast" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Google", speed: "Slow" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", provider: "Google", speed: "Medium" },
  { id: "openai/gpt-5", label: "GPT-5", provider: "OpenAI", speed: "Medium" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", provider: "OpenAI", speed: "Fast" },
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano", provider: "OpenAI", speed: "Fastest" },
  { id: "openai/gpt-5.2", label: "GPT-5.2", provider: "OpenAI", speed: "Medium" },
] as const;

export type ModelId = (typeof AI_MODELS)[number]["id"];

interface ModelSelectorProps {
  value: ModelId;
  onChange: (model: ModelId) => void;
  disabled?: boolean;
}

const ModelSelector = ({ value, onChange, disabled }: ModelSelectorProps) => {
  const selected = AI_MODELS.find((m) => m.id === value);

  return (
    <Select value={value} onValueChange={(v) => onChange(v as ModelId)} disabled={disabled}>
      <SelectTrigger className="h-8 w-auto gap-1.5 rounded-lg border-border bg-card px-2.5 text-xs font-medium">
        <Sparkles className="h-3 w-3 text-muted-foreground" />
        <SelectValue>{selected?.label ?? "Select model"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {AI_MODELS.map((m) => (
          <SelectItem key={m.id} value={m.id} className="text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium">{m.label}</span>
              <span className="text-muted-foreground">{m.provider}</span>
              <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {m.speed}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ModelSelector;
