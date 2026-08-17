import { useEffect, useState } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { fetchModels, type ModelInfo } from "@/lib/api";

// ── Static fallback models (always available even if backend is down) ─────────
export const STATIC_MODELS: ModelInfo[] = [
  // Google Gemini
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", provider: "Google", speed: "Fast" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google", speed: "Fast" },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", provider: "Google", speed: "Fastest" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Google", speed: "Slow" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", provider: "Google", speed: "Medium" },
  // OpenAI
  { id: "openai/gpt-5", label: "GPT-5", provider: "OpenAI", speed: "Medium" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", provider: "OpenAI", speed: "Fast" },
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano", provider: "OpenAI", speed: "Fastest" },
  { id: "openai/gpt-4o", label: "GPT-4o", provider: "OpenAI", speed: "Fast" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI", speed: "Fastest" },
  // Anthropic
  { id: "anthropic/claude-opus-4", label: "Claude Opus 4", provider: "Anthropic", speed: "Slow" },
  { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5", provider: "Anthropic", speed: "Medium" },
  { id: "anthropic/claude-3-5-haiku", label: "Claude 3.5 Haiku", provider: "Anthropic", speed: "Fast" },
  // Ollama (Local)
  { id: "ollama/llama3.2", label: "Llama 3.2", provider: "Ollama (Local)", speed: "Fast" },
  { id: "ollama/mistral", label: "Mistral", provider: "Ollama (Local)", speed: "Fast" },
  { id: "ollama/codellama", label: "CodeLlama", provider: "Ollama (Local)", speed: "Medium" },
  { id: "ollama/gemma3", label: "Gemma 3", provider: "Ollama (Local)", speed: "Fast" },
  { id: "ollama/phi4", label: "Phi-4", provider: "Ollama (Local)", speed: "Fast" },
  // OpenRouter
  { id: "openrouter/meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", provider: "OpenRouter", speed: "Fast" },
  { id: "openrouter/mistralai/mistral-large", label: "Mistral Large", provider: "OpenRouter", speed: "Medium" },
  { id: "openrouter/deepseek/deepseek-chat", label: "DeepSeek Chat", provider: "OpenRouter", speed: "Fast" },
  // HuggingFace
  { id: "huggingface/meta-llama/Llama-3.1-8B-Instruct", label: "Llama 3.1 8B", provider: "HuggingFace", speed: "Fast" },
  { id: "huggingface/mistralai/Mistral-7B-Instruct-v0.3", label: "Mistral 7B", provider: "HuggingFace", speed: "Fast" },
  // LiteLLM
  { id: "litellm/gpt-4o", label: "GPT-4o (LiteLLM)", provider: "LiteLLM", speed: "Fast" },
  { id: "litellm/claude-3-5-sonnet", label: "Claude 3.5 Sonnet (LiteLLM)", provider: "LiteLLM", speed: "Medium" },
];

export const AVAILABLE_MODELS = STATIC_MODELS;

export type ModelId = string;

// Group models by provider
function groupByProvider(models: ModelInfo[]): Record<string, ModelInfo[]> {
  return models.reduce(
    (acc, m) => {
      if (!acc[m.provider]) acc[m.provider] = [];
      acc[m.provider].push(m);
      return acc;
    },
    {} as Record<string, ModelInfo[]>
  );
}

interface ModelSelectorProps {
  value: ModelId;
  onChange: (model: ModelId) => void;
  disabled?: boolean;
}

const ModelSelector = ({ value, onChange, disabled }: ModelSelectorProps) => {
  const [models, setModels] = useState<ModelInfo[]>(STATIC_MODELS);
  const [loading, setLoading] = useState(false);

  // Fetch dynamic models from backend (merge with static fallback)
  useEffect(() => {
    setLoading(true);
    fetchModels()
      .then((dynamic) => {
        if (dynamic.length > 0) {
          // Merge: backend models take priority, fill gaps with static ones
          const ids = new Set(dynamic.map((m) => m.id));
          const extra = STATIC_MODELS.filter((m) => !ids.has(m.id));
          setModels([...dynamic, ...extra]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const selected = models.find((m) => m.id === value);
  const groups = groupByProvider(models);

  return (
    <Select value={value} onValueChange={(v) => onChange(v as ModelId)} disabled={disabled}>
      <SelectTrigger className="h-8 w-auto gap-1.5 rounded-lg border-border bg-card px-2.5 text-xs font-medium">
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : (
          <Sparkles className="h-3 w-3 text-muted-foreground" />
        )}
        <SelectValue>{selected?.label ?? value ?? "Select model"}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80 overflow-y-auto">
        {Object.entries(groups).map(([provider, items]) => (
          <SelectGroup key={provider}>
            <SelectLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
              {provider}
            </SelectLabel>
            {items.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{m.label || m.id}</span>
                  {m.speed && (
                    <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {m.speed}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ModelSelector;
