import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  FileText, Sparkles, Download, Copy, Check,
  BookOpen, Edit3, Eye, RefreshCw, FileCode, Mic, MicOff, Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import AppLayout from "@/components/AppLayout";
import ModelSelector, { type ModelId } from "@/components/ModelSelector";
import { streamChat, startVoiceRecognition } from "@/lib/api";

const DOC_TYPES = [
  { id: "prd", label: "Product Requirements Document (PRD)" },
  { id: "tech_spec", label: "Technical Architecture Spec" },
  { id: "resume", label: "Executive Resume & Bio" },
  { id: "proposal", label: "Business Proposal & Scope of Work" },
  { id: "whitepaper", label: "Deep-Dive Research Whitepaper" },
  { id: "api_docs", label: "API Reference Documentation" },
];

const TEMPLATES = [
  { label: "🚀 B2B SaaS PRD", prompt: "Product Requirements Document for an Autonomous AI Creative & Developer Workspace" },
  { label: "⚡ Event-Driven Tech Spec", prompt: "Technical Architecture Specification: Distributed Microservices, Kafka & Rust" },
  { label: "💼 Enterprise Proposal", prompt: "Enterprise Scope of Work Proposal: AI Platform Migration, SLA & Compliance" },
  { label: "🛡️ Security Whitepaper", prompt: "Comprehensive Whitepaper: Zero-Trust AI Agent Security & Data Governance" },
];

const DEFAULT_DOC = `# Product Requirements Document: GUIDESOFT Workspace 2.0

## 1. Executive Summary
**GUIDESOFT** is a unified agentic platform that combines generative chat, autonomous coding, automated slide presentations, intelligent spreadsheets, and multimedia synthesis into a single local-first desktop application.

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
  const [isListening, setIsListening] = useState(false);
  const [documentContent, setDocumentContent] = useState(DEFAULT_DOC);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");
  const voiceControllerRef = useRef<{ stop: () => void } | null>(null);

  const wordCount = documentContent.trim().split(/\s+/).filter(Boolean).length;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  const generateWithTopic = async (targetTopic: string) => {
    if (!targetTopic.trim() || isGenerating) return;
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
        messages: [{ role: "user", content: `Create a ${selectedTypeObj?.label}: ${targetTopic}` }],
        model,
        systemPrompt,
        onDelta: (chunk) => {
          accumulated += chunk;
          setDocumentContent(accumulated);
        },
        onDone: () => {
          setIsGenerating(false);
          toast.success("Document generated successfully!");
        },
      });
    } catch (e: any) {
      setIsGenerating(false);
      toast.error(e.message || "Failed to generate document");
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      voiceControllerRef.current?.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    toast.info("Listening... Speak your document topic.");

    const controller = startVoiceRecognition({
      onResult: (transcript) => {
        setTopic(transcript);
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

  const handleCopy = () => {
    navigator.clipboard.writeText(documentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleDownloadMD = () => {
    const blob = new Blob([documentContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guidesoft_doc_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown file downloaded!");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
        {/* Top Header */}
        <div className="border-b border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-primary-foreground">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground font-heading">AI Document Studio</h1>
                <p className="text-[11px] text-muted-foreground">Draft PRDs, technical specifications, enterprise whitepapers, and proposals</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="h-8 w-56 text-xs rounded-xl">
                  <SelectValue placeholder="Document Type" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="text-xs">
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 gap-1.5 text-xs rounded-xl">
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />} Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadMD} className="h-8 gap-1.5 text-xs rounded-xl">
                <Download className="h-3.5 w-3.5" /> Export .md
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 gap-1.5 text-xs rounded-xl">
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px]">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") generateWithTopic(topic); }}
                placeholder="Enter document topic or specification goals..."
                className="h-9 text-xs pr-9 rounded-xl"
              />
              <button
                type="button"
                onClick={toggleVoice}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${
                  isListening ? "text-red-500 animate-pulse" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Voice Dictation"
              >
                {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="w-48">
              <ModelSelector value={model} onChange={setModel} disabled={isGenerating} />
            </div>

            <Button
              onClick={() => generateWithTopic(topic)}
              disabled={!topic.trim() || isGenerating}
              className="h-9 gap-1.5 text-xs rounded-xl shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" /> {isGenerating ? "Authoring..." : "Generate Document"}
            </Button>
          </div>

          {/* Quick template triggers */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase flex-shrink-0">Starter Templates:</span>
            {TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onClick={() => {
                  setTopic(tpl.prompt);
                  generateWithTopic(tpl.prompt);
                }}
                className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all flex-shrink-0"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Document Editor / Preview Body */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden bg-muted/10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "preview" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("preview")}
                className="h-8 text-xs gap-1.5 rounded-xl"
              >
                <Eye className="h-3.5 w-3.5" /> Rendered View
              </Button>
              <Button
                variant={viewMode === "edit" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("edit")}
                className="h-8 text-xs gap-1.5 rounded-xl"
              >
                <Edit3 className="h-3.5 w-3.5" /> Markdown Source
              </Button>
            </div>

            {viewMode === "edit" && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDocumentContent((prev) => prev + "\n\n## New Heading\n")}
                  className="h-7 px-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground"
                  title="Add Heading"
                >
                  H2
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDocumentContent((prev) => prev + "\n**Bold text** ")}
                  className="h-7 px-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                  title="Add Bold"
                >
                  B
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDocumentContent((prev) => prev + "\n- Bullet point\n- Bullet point\n")}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  title="Add List"
                >
                  • List
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDocumentContent((prev) => prev + "\n```typescript\n// Code snippet\n```\n")}
                  className="h-7 px-2 text-xs font-mono text-muted-foreground hover:text-foreground"
                  title="Add Code Block"
                >
                  {"{ }"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDocumentContent((prev) => prev + "\n| Column 1 | Column 2 |\n| :--- | :--- |\n| Value 1 | Value 2 |\n")}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  title="Add Table"
                >
                  Table
                </Button>
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>~{readTimeMin} min read</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card shadow-sm p-6 sm:p-10">
            {viewMode === "preview" ? (
              <div className="prose prose-sm dark:prose-invert max-w-3xl mx-auto [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-4 [&_code]:text-xs leading-relaxed">
                <ReactMarkdown>{documentContent || "_Enter a topic and click 'Generate Document' to create a technical spec or PRD._"}</ReactMarkdown>
              </div>
            ) : (
              <Textarea
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
                className="w-full h-full min-h-[500px] border-none bg-transparent p-0 font-mono text-xs text-foreground resize-none focus:outline-none leading-relaxed"
                placeholder="Markdown content will appear here..."
              />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DocsGen;
