import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, Sparkles, Download, Copy, Check,
  BookOpen, Edit3, Eye, RefreshCw, FileCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import AppLayout from "@/components/AppLayout";
import ModelSelector, { type ModelId } from "@/components/ModelSelector";
import { streamChat } from "@/lib/api";

const DOC_TYPES = [
  { id: "prd", label: "Product Requirements Document (PRD)" },
  { id: "tech_spec", label: "Technical Architecture Spec" },
  { id: "resume", label: "Executive Resume & Bio" },
  { id: "proposal", label: "Business Proposal & Scope of Work" },
  { id: "whitepaper", label: "Deep-Dive Research Whitepaper" },
  { id: "api_docs", label: "API Reference Documentation" },
];

const DEFAULT_DOC = `# Product Requirements Document (PRD): AI Super Workspace 2.0

## 1. Executive Summary
The **AI Super Workspace** is a unified agentic platform that combines generative chat, autonomous coding, automated slide presentations, intelligent spreadsheets, and multimedia synthesis into a single local-first desktop application.

## 2. Target Audience & Personas
- **Software Engineers & Architects:** Require zero-friction code generation, refactoring, and sandbox execution.
- **Product Managers & Executives:** Need instant deck creation, financial projections, and automated meeting summarization.
- **Designers & Content Creators:** Rely on prompt-to-deliverable image, video storyboard, and music generation.

## 3. Core Functional Requirements
- **Local-First Architecture:** Complete zero-dependency execution with local Ollama models.
- **Multi-Model Orchestration:** Seamless fallback across Google Gemini, OpenAI GPT-4o, Anthropic Claude, and local Llama 3.2.
- **Universal Export Pipelines:** One-click outputs to HTML, CSV, Markdown, and media files.

## 4. Success Metrics & KPIs
- Sub-500ms time-to-first-token on streaming outputs.
- 100% offline local functionality without external cloud keys required.
`;

const DocsGen = () => {
  const [topic, setTopic] = useState("");
  const [docType, setDocType] = useState("prd");
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [documentContent, setDocumentContent] = useState(DEFAULT_DOC);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");

  const wordCount = documentContent.trim().split(/\s+/).filter(Boolean).length;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  const handleGenerate = async () => {
    if (!topic.trim() || isGenerating) return;
    setIsGenerating(true);
    setDocumentContent("");
    setViewMode("preview");

    const selectedTypeObj = DOC_TYPES.find((d) => d.id === docType);
    const systemPrompt = `You are a professional technical writer and document architect.
Generate a comprehensive, beautifully formatted Markdown ${selectedTypeObj?.label || "document"} based on the topic.
Use clear headings (#, ##, ###), bold highlights, bullet points, callout quotes, and structured tables where applicable.
Produce an exhaustive, production-ready deliverable with zero conversational filler.`;

    let accumulated = "";

    try {
      await streamChat({
        messages: [{ role: "user", content: `Create a ${selectedTypeObj?.label}: ${topic}` }],
        model,
        systemPrompt,
        onDelta: (chunk) => {
          accumulated += chunk;
          setDocumentContent(accumulated);
        },
        onDone: () => {
          setIsGenerating(false);
          toast.success("Document generated!");
        },
      });
    } catch (e: any) {
      setIsGenerating(false);
      toast.error(e.message || "Failed to generate document");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(documentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleDownloadMD = () => {
    const blob = new Blob([documentContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(topic || "document").replace(/[^a-zA-Z0-9]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded as Markdown!");
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="border-b border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-primary-foreground">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">AI Document Studio</h1>
                <p className="text-[11px] text-muted-foreground">Draft PRDs, technical specs, proposals, and comprehensive documentation</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground mr-2 font-medium">
                {wordCount} words • ~{readTimeMin} min read
              </div>
              <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 gap-1.5 text-xs">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadMD} className="h-8 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> Export MD
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
              placeholder="What document would you like to create? (e.g. Next-Gen Authentication PRD)..."
              className="flex-1 min-w-[280px] h-9 text-xs"
            />

            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="w-56 h-9 text-xs">
                <BookOpen className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Doc Type" />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-48">
              <ModelSelector value={model} onChange={setModel} />
            </div>

            <Button onClick={handleGenerate} disabled={!topic.trim() || isGenerating} className="h-9 gap-1.5 text-xs">
              {isGenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate Doc
            </Button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden bg-muted/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "preview" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("preview")}
                className="h-8 text-xs gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" /> Rendered View
              </Button>
              <Button
                variant={viewMode === "edit" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("edit")}
                className="h-8 text-xs gap-1.5"
              >
                <Edit3 className="h-3.5 w-3.5" /> Markdown Source
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-8 shadow-sm">
            {viewMode === "preview" ? (
              <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                <ReactMarkdown>{documentContent || "_Generating document..._"}</ReactMarkdown>
              </div>
            ) : (
              <Textarea
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
                className="w-full h-full min-h-[500px] font-mono text-xs leading-relaxed bg-transparent border-0 focus-visible:ring-0 resize-none"
              />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DocsGen;
