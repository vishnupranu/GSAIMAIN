import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Headphones, Sparkles, Mic, MicOff, Download, Copy,
  Check, FileText, CheckCircle2, Mail, Users, AlertCircle, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import ModelSelector, { type ModelId } from "@/components/ModelSelector";
import { streamChat, startVoiceRecognition } from "@/lib/api";

interface ActionItem {
  task: string;
  assignee: string;
  priority: "High" | "Medium" | "Low";
  dueDate: string;
  completed?: boolean;
}

interface MeetingNotesData {
  title: string;
  executiveSummary: string;
  decisions: string[];
  actionItems: ActionItem[];
  followUpEmail: string;
}

const DEFAULT_TRANSCRIPT = `Alex: Alright team, let's review the Q3 launch roadmap. Sarah, how is the backend API scaling?
Sarah: The FastAPI cluster and local Ollama model fallback layer are 100% operational. Response latency is down to 45ms.
Alex: Outstanding. David, what about the frontend studios?
David: All 12 AI workspaces (Slides, Sheets, Docs, Music, Video, Designer) are completely integrated with zero third-party API dependencies.
Sarah: We should finalize the load testing by this Friday.
Alex: Agreed. Sarah, please own the stress benchmarks. David, prepare the design token documentation by next Monday. Let's schedule the final executive sign-off for next Tuesday at 10 AM.`;

const DEFAULT_NOTES: MeetingNotesData = {
  title: "Q3 Launch Roadmap & AI Workspace Review",
  executiveSummary: "The engineering team reviewed the Q3 architecture status. The FastAPI backend and local Ollama multi-model fallbacks are performing with sub-50ms latency. All 12 studio workspaces are fully integrated with zero external dependencies.",
  decisions: [
    "Final load testing and stress benchmarks scheduled for completion by this Friday.",
    "Executive sign-off meeting confirmed for next Tuesday at 10:00 AM.",
    "Production deployment approved pending final load test pass."
  ],
  actionItems: [
    {
      task: "Execute final cluster load testing and stress benchmarks",
      assignee: "Sarah",
      priority: "High",
      dueDate: "This Friday",
      completed: false
    },
    {
      task: "Finalize design token documentation and studio guides",
      assignee: "David",
      priority: "Medium",
      dueDate: "Next Monday",
      completed: false
    },
    {
      task: "Distribute executive sign-off meeting invite and agenda",
      assignee: "Alex",
      priority: "Low",
      dueDate: "Next Tuesday",
      completed: true
    }
  ],
  followUpEmail: `Subject: Recap & Action Items: Q3 Launch Roadmap Review

Hi Team,

Thank you for a productive review today. Here is the executive summary and next steps:

Summary:
The backend architecture and local Ollama model fallback layer are performing with exceptional sub-50ms latency. All 12 studio modules are successfully wired.

Action Items:
• Sarah: Finalize cluster stress testing by Friday.
• David: Complete design token documentation by Monday.
• Alex: Facilitate executive sign-off next Tuesday @ 10 AM.

Best regards,
GUIDESOFT Team`
};

const MeetingNotes = () => {
  const [transcript, setTranscript] = useState(DEFAULT_TRANSCRIPT);
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [notes, setNotes] = useState<MeetingNotesData>(DEFAULT_NOTES);
  const [isRecording, setIsRecording] = useState(false);
  const [copied, setCopied] = useState(false);
  const voiceControllerRef = useRef<{ stop: () => void } | null>(null);

  // Web Speech API Voice Dictation
  const toggleRecording = () => {
    if (isRecording) {
      voiceControllerRef.current?.stop();
      setIsRecording(false);
      toast.info("Microphone dictation stopped.");
      return;
    }

    setIsRecording(true);
    toast.success("Listening... Speak your meeting dialogue.");

    const controller = startVoiceRecognition({
      onResult: (text) => {
        setTranscript(text);
      },
      onError: (err) => {
        toast.error(`Voice error: ${err}`);
        setIsRecording(false);
      },
      onEnd: () => {
        setIsRecording(false);
      }
    });

    if (controller) {
      voiceControllerRef.current = controller;
    } else {
      setIsRecording(false);
    }
  };

  const handleGenerate = async () => {
    if (!transcript.trim() || isGenerating) return;
    setIsGenerating(true);

    const systemPrompt = `You are an elite executive assistant and meeting intelligence analyst.
Analyze the meeting transcript and extract structured executive notes.
Respond with a JSON object matching this schema:
{
  "title": "Meeting Title",
  "executiveSummary": "Concise 2-3 sentence overview",
  "decisions": ["Decision 1", "Decision 2"],
  "actionItems": [
    {
      "task": "Specific task description",
      "assignee": "Person name or team",
      "priority": "High" | "Medium" | "Low",
      "dueDate": "Timeline or date"
    }
  ],
  "followUpEmail": "Ready-to-send email recap with Subject line"
}`;

    let accumulated = "";

    try {
      await streamChat({
        messages: [{ role: "user", content: `Extract meeting notes from transcript:\n\n${transcript}` }],
        model,
        systemPrompt,
        onDelta: (chunk) => {
          accumulated += chunk;
        },
        onDone: () => {
          setIsGenerating(false);
          try {
            const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.executiveSummary) {
                setNotes({
                  title: parsed.title || "Meeting Minutes & Action Items",
                  executiveSummary: parsed.executiveSummary,
                  decisions: Array.isArray(parsed.decisions) ? parsed.decisions : ["Decisions ratified as discussed."],
                  actionItems: Array.isArray(parsed.actionItems)
                    ? parsed.actionItems.map((item: any) => ({ ...item, completed: false }))
                    : DEFAULT_NOTES.actionItems,
                  followUpEmail: parsed.followUpEmail || DEFAULT_NOTES.followUpEmail,
                });
                toast.success("Meeting intelligence synthesized!");
                return;
              }
            }
          } catch {}

          // Fallback parsing from text
          setNotes({
            title: "Executive Meeting Minutes",
            executiveSummary: accumulated.slice(0, 240) || DEFAULT_NOTES.executiveSummary,
            decisions: ["Architecture milestones approved.", "Team deliverables assigned."],
            actionItems: [
              { task: "Follow up on discussion items", assignee: "Team", priority: "High", dueDate: "This Week", completed: false }
            ],
            followUpEmail: `Subject: Meeting Summary & Action Items\n\nHi Team,\n\nPlease review the discussion summary:\n\n${accumulated.slice(0, 300)}...\n\nBest,\nGUIDESOFT Intelligence`,
          });
          toast.success("Meeting notes updated!");
        },
      });
    } catch (e: any) {
      setIsGenerating(false);
      toast.error(e.message || "Failed to generate meeting notes");
    }
  };

  const toggleTask = (index: number) => {
    setNotes((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((item, idx) =>
        idx === index ? { ...item, completed: !item.completed } : item
      ),
    }));
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(notes.followUpEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Follow-up email copied to clipboard!");
  };

  const handleDownloadPlan = () => {
    const content = `# ${notes.title}\n\n## Executive Summary\n${notes.executiveSummary}\n\n## Decisions Made\n${notes.decisions.map(d => `- ${d}`).join('\n')}\n\n## Action Items\n${notes.actionItems.map(a => `- [${a.completed ? 'x' : ' '}] **${a.task}** (${a.assignee}) - Priority: ${a.priority}, Due: ${a.dueDate}`).join('\n')}\n\n---\n## Follow-up Email\n${notes.followUpEmail}`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meeting_action_plan_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Action plan downloaded!");
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
        {/* Top Header */}
        <div className="border-b border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-primary-foreground">
                <Headphones className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground font-heading">AI Meeting Notes</h1>
                <p className="text-[11px] text-muted-foreground">Live speech-to-text dictation and autonomous synthesis of decisions, action items, and emails</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                onClick={toggleRecording}
                className="h-8 gap-1.5 text-xs rounded-xl"
              >
                {isRecording ? <MicOff className="h-3.5 w-3.5 animate-pulse" /> : <Mic className="h-3.5 w-3.5" />}
                {isRecording ? "Stop Dictation" : "Start Voice Dictation"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPlan} className="h-8 gap-1.5 text-xs rounded-xl">
                <Download className="h-3.5 w-3.5" /> Download Plan
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="w-56">
              <ModelSelector value={model} onChange={setModel} disabled={isGenerating} />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTranscript(DEFAULT_TRANSCRIPT)}
                className="h-8 text-xs rounded-xl"
              >
                Load Sample Transcript
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!transcript.trim() || isGenerating}
                size="sm"
                className="h-8 gap-1.5 text-xs rounded-xl shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" /> {isGenerating ? "Synthesizing..." : "Generate Meeting Minutes"}
              </Button>
            </div>
          </div>
        </div>

        {/* Dual Pane: Transcript on Left, Executive Notes on Right */}
        <div className="grid flex-1 grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Transcript Panel */}
          <div className="lg:col-span-5 flex flex-col border-b lg:border-b-0 lg:border-r border-border bg-card/40 p-4 sm:p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Meeting Transcript / Audio Stream</h3>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">{transcript.length} chars</span>
            </div>

            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste meeting dialogue, zoom transcripts, or click 'Start Voice Dictation' to record in real-time..."
              className="flex-1 w-full rounded-2xl border border-border bg-background p-4 text-xs font-mono leading-relaxed text-foreground resize-none focus:border-primary/50"
            />
          </div>

          {/* Intelligence & Deliverables Panel */}
          <div className="lg:col-span-7 flex flex-col overflow-y-auto bg-muted/5 p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground font-heading">{notes.title}</h2>
                <p className="text-xs text-muted-foreground">Synthesized Intelligence & Executive Action Plan</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyEmail} className="h-8 gap-1.5 text-xs rounded-xl">
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />} Copy Email
              </Button>
            </div>

            {/* Executive Summary */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Executive Summary</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-foreground font-medium">{notes.executiveSummary}</p>
            </div>

            {/* Key Decisions */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Key Decisions Made</span>
              </div>
              <ul className="space-y-2">
                {notes.decisions.map((dec, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground leading-relaxed">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-primary">
                      {idx + 1}
                    </span>
                    <span>{dec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Items Matrix */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Action Items & Ownership</span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                  {notes.actionItems.filter(a => a.completed).length}/{notes.actionItems.length} Done
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-[11px] uppercase font-semibold text-muted-foreground">
                      <th className="p-2.5 w-8 text-center">Status</th>
                      <th className="p-2.5">Task Description</th>
                      <th className="p-2.5">Assignee</th>
                      <th className="p-2.5">Priority</th>
                      <th className="p-2.5">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notes.actionItems.map((item, idx) => (
                      <tr
                        key={idx}
                        onClick={() => toggleTask(idx)}
                        className={`border-b border-border/50 transition-colors cursor-pointer hover:bg-accent/40 ${
                          item.completed ? "line-through opacity-60 bg-muted/20" : ""
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={!!item.completed}
                            onChange={() => toggleTask(idx)}
                            className="rounded border-border"
                          />
                        </td>
                        <td className="p-2.5 font-medium text-foreground">{item.task}</td>
                        <td className="p-2.5 text-muted-foreground">
                          <span className="rounded-md bg-accent px-2 py-0.5 font-mono text-[11px]">{item.assignee}</span>
                        </td>
                        <td className="p-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.priority === "High"
                              ? "bg-red-500/10 text-red-500 border border-red-500/20"
                              : item.priority === "Medium"
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : "bg-green-500/10 text-green-500 border border-green-500/20"
                          }`}>
                            {item.priority}
                          </span>
                        </td>
                        <td className="p-2.5 text-muted-foreground font-mono text-[11px]">{item.dueDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Follow-up Email Draft */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Executive Follow-Up Email</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCopyEmail} className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  <Copy className="h-3 w-3" /> Copy
                </Button>
              </div>
              <pre className="rounded-xl border border-border bg-background p-4 font-sans text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                {notes.followUpEmail}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MeetingNotes;
