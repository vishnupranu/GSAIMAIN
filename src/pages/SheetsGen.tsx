import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Table2, Sparkles, Download, Copy, Check, Plus,
  Trash2, ArrowUpDown, RefreshCw, FileSpreadsheet, Calculator, Mic, MicOff, ArrowUp, ArrowDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import ModelSelector, { type ModelId } from "@/components/ModelSelector";
import { streamChat, startVoiceRecognition } from "@/lib/api";

interface SheetData {
  title: string;
  description: string;
  columns: string[];
  rows: (string | number)[][];
  summaryMetrics?: { label: string; value: string }[];
}

const TEMPLATES = [
  { label: "📈 SaaS 5-Yr Forecast", prompt: "SaaS 5-Year Financial Model (ARR, Churn, CAC, LTV, Gross Margin)" },
  { label: "🎯 Marketing ROI", prompt: "Quarterly Marketing Campaign ROI & Conversion Rates across Google, Meta, LinkedIn" },
  { label: "💼 Cap Table Matrix", prompt: "Startup Cap Table & Equity Ownership Distribution across Founders, VCs, and ESOP" },
  { label: "📦 Inventory Matrix", prompt: "E-Commerce Product Inventory, COGS, Reorder Levels & Profit Margin Matrix" },
];

const DEFAULT_SHEET: SheetData = {
  title: "SaaS Financial Projections 2025-2027",
  description: "Annual recurring revenue, customer acquisition cost, and gross margin analysis",
  columns: ["Period", "New Customers", "Total ARR ($k)", "CAC ($)", "Churn (%)", "Gross Margin (%)"],
  rows: [
    ["2025 Q1", 120, 480, 850, "1.8%", "78%"],
    ["2025 Q2", 185, 740, 810, "1.5%", "80%"],
    ["2025 Q3", 260, 1040, 780, "1.4%", "81%"],
    ["2025 Q4", 390, 1560, 720, "1.2%", "83%"],
    ["2026 Q1", 520, 2080, 690, "1.1%", "84%"],
    ["2026 Q2", 710, 2840, 650, "0.9%", "85%"],
  ],
  summaryMetrics: [
    { label: "Ending ARR", value: "$2.84M" },
    { label: "Avg Gross Margin", value: "81.8%" },
    { label: "Target CAC", value: "$650" },
    { label: "Total Growth", value: "+491%" },
  ]
};

function safeEvalFormula(expr: string): string {
  try {
    const sanitized = expr.replace(/[^0-9+\-*/(). ]/g, "");
    if (!sanitized) return expr;
    // Use Function constructor for isolated arithmetic math evaluation
    const result = new Function(`return (${sanitized})`)();
    return Number.isFinite(result) ? String(Math.round(result * 100) / 100) : expr;
  } catch {
    return expr;
  }
}

const SheetsGen = () => {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sheet, setSheet] = useState<SheetData>(DEFAULT_SHEET);
  const [copied, setCopied] = useState(false);
  const [sortState, setSortState] = useState<{ colIdx: number; direction: "asc" | "desc" } | null>(null);
  const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>(null);
  const voiceControllerRef = useRef<{ stop: () => void } | null>(null);

  const generateWithPrompt = async (targetPrompt: string) => {
    if (!targetPrompt.trim() || isGenerating) return;
    setIsGenerating(true);

    const systemPrompt = `You are a financial analyst and data engineer spreadsheet generator.
Based on the user's request, create a structured dataset with realistic figures and mathematical relationships.
Respond ONLY with a valid JSON object matching this schema:
{
  "title": "Sheet Title",
  "description": "Short explanation of the dataset",
  "columns": ["Col 1", "Col 2", "Col 3", "Col 4", "Col 5"],
  "rows": [
    ["Row 1 Val 1", 100, 200, "50%", "Val 5"],
    ["Row 2 Val 1", 150, 280, "55%", "Val 5"]
  ],
  "summaryMetrics": [
    { "label": "Key Metric 1", "value": "$1.2M" },
    { "label": "Key Metric 2", "value": "24.5%" }
  ]
}`;

    let accumulated = "";

    try {
      await streamChat({
        messages: [{ role: "user", content: `Generate spreadsheet: ${targetPrompt}` }],
        model,
        systemPrompt,
        onDelta: (chunk) => {
          accumulated += chunk;
        },
        onDone: () => {
          setIsGenerating(false);
          try {
            const cleaned = accumulated.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            if (parsed.columns && Array.isArray(parsed.rows)) {
              setSheet(parsed);
              toast.success(`Spreadsheet "${parsed.title || "Data"}" generated!`);
              return;
            }
          } catch {}

          // Fallback parser
          setSheet({
            title: targetPrompt,
            description: "AI Structured Financial Dataset",
            columns: ["Category", "Metric", "Q1 Actual", "Q2 Target", "Q3 Forecast", "Variance"],
            rows: [
              ["Revenue", "Core ARR ($k)", 450, 620, 890, "+18%"],
              ["Operations", "Gross Margin", "82%", "85%", "88%", "+3%"],
              ["Acquisition", "Blended CAC ($)", 320, 280, 240, "-14%"],
              ["Retention", "NRR", "128%", "132%", "135%", "+4%"],
            ],
            summaryMetrics: [
              { label: "Ending ARR", value: "$890k" },
              { label: "Avg Margin", value: "85%" },
            ]
          });
          toast.success("Spreadsheet updated!");
        },
      });
    } catch (e: any) {
      setIsGenerating(false);
      toast.error(e.message || "Failed to generate sheet");
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      voiceControllerRef.current?.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    toast.info("Listening... Describe the spreadsheet data you need.");

    const controller = startVoiceRecognition({
      onResult: (transcript) => {
        setPrompt(transcript);
      },
      onError: (err) => {
        toast.error(err);
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

  const handleCellChange = (rowIndex: number, colIndex: number, rawVal: string) => {
    let finalVal = rawVal;
    if (rawVal.startsWith("=")) {
      finalVal = safeEvalFormula(rawVal.slice(1));
    }
    const updatedRows = [...sheet.rows];
    updatedRows[rowIndex] = [...updatedRows[rowIndex]];
    updatedRows[rowIndex][colIndex] = finalVal;
    setSheet({ ...sheet, rows: updatedRows });
  };

  const handleSortColumn = (colIdx: number) => {
    let newDirection: "asc" | "desc" = "asc";
    if (sortState && sortState.colIdx === colIdx && sortState.direction === "asc") {
      newDirection = "desc";
    }

    const sortedRows = [...sheet.rows].sort((a, b) => {
      const valA = a[colIdx];
      const valB = b[colIdx];
      const numA = typeof valA === "number" ? valA : parseFloat(String(valA).replace(/[^0-9.-]/g, ""));
      const numB = typeof valB === "number" ? valB : parseFloat(String(valB).replace(/[^0-9.-]/g, ""));

      if (!isNaN(numA) && !isNaN(numB)) {
        return newDirection === "asc" ? numA - numB : numB - numA;
      }
      return newDirection === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    setSortState({ colIdx, direction: newDirection });
    setSheet({ ...sheet, rows: sortedRows });
    toast.success(`Sorted column "${sheet.columns[colIdx]}" (${newDirection.toUpperCase()})`);
  };

  const handleAddRow = () => {
    const newRow = sheet.columns.map((_, i) => (i === 0 ? `Item ${sheet.rows.length + 1}` : "0"));
    setSheet({ ...sheet, rows: [...sheet.rows, newRow] });
    toast.success("Row added!");
  };

  const handleAddColumn = () => {
    const colName = `Col ${sheet.columns.length + 1}`;
    const updatedCols = [...sheet.columns, colName];
    const updatedRows = sheet.rows.map((row) => [...row, "-"]);
    setSheet({ ...sheet, columns: updatedCols, rows: updatedRows });
    toast.success("Column added!");
  };

  const handleDeleteRow = (index: number) => {
    if (sheet.rows.length <= 1) {
      toast.error("Spreadsheet must contain at least one row.");
      return;
    }
    const updatedRows = sheet.rows.filter((_, i) => i !== index);
    setSheet({ ...sheet, rows: updatedRows });
  };

  const handleExportCSV = () => {
    const header = sheet.columns.join(",");
    const body = sheet.rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const csvContent = `${header}\n${body}`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sheet.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV file downloaded!");
  };

  const handleCopyTable = () => {
    const header = sheet.columns.join("\t");
    const body = sheet.rows.map((r) => r.join("\t")).join("\n");
    navigator.clipboard.writeText(`${header}\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Table copied to clipboard (pasteable into Excel & Google Sheets)!");
  };

  const activeCellValue =
    activeCell !== null && sheet.rows[activeCell.r] ? sheet.rows[activeCell.r][activeCell.c] : "";

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
        {/* Top Header */}
        <div className="border-b border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-primary-foreground">
                <Table2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground font-heading">AI Spreadsheet Studio</h1>
                <p className="text-[11px] text-muted-foreground">Synthesize tabular data, formula engine, and export to CSV/Excel</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyTable} className="h-8 gap-1.5 text-xs rounded-xl">
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />} Copy Table
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 gap-1.5 text-xs rounded-xl">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px]">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") generateWithPrompt(prompt); }}
                placeholder="Describe table (e.g. SaaS 5-Yr Forecast, Startup Cap Table, Marketing ROI Matrix)..."
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
              onClick={() => generateWithPrompt(prompt)}
              disabled={!prompt.trim() || isGenerating}
              className="h-9 gap-1.5 text-xs rounded-xl shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" /> {isGenerating ? "Computing..." : "Generate Sheet"}
            </Button>
          </div>

          {/* Quick template triggers */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase flex-shrink-0">Starter Datasets:</span>
            {TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onClick={() => {
                  setPrompt(tpl.prompt);
                  generateWithPrompt(tpl.prompt);
                }}
                className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all flex-shrink-0"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-muted/10">
          {/* Summary KPIs Banner */}
          {sheet.summaryMetrics && sheet.summaryMetrics.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {sheet.summaryMetrics.map((m, idx) => (
                <div key={idx} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase">{m.label}</span>
                  <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">{m.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Formula Bar */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs">
            <Calculator className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-mono font-bold text-muted-foreground w-12 flex-shrink-0">
              {activeCell ? `R${activeCell.r + 1}C${activeCell.c + 1}` : "Formula"}:
            </span>
            <span className="font-mono text-foreground truncate">
              {activeCell !== null ? String(activeCellValue) : "Click any cell to edit or enter formulas (=50*1.2, =100+45)"}
            </span>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-4 bg-card/60">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground font-heading">{sheet.title}</h2>
                <p className="text-xs text-muted-foreground">{sheet.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleAddRow} className="h-7 text-xs gap-1 rounded-lg">
                  <Plus className="h-3 w-3" /> Add Row
                </Button>
                <Button size="sm" variant="outline" onClick={handleAddColumn} className="h-7 text-xs gap-1 rounded-lg">
                  <Plus className="h-3 w-3" /> Add Column
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-muted-foreground font-semibold">
                    {sheet.columns.map((col, idx) => (
                      <th
                        key={idx}
                        onClick={() => handleSortColumn(idx)}
                        className="p-3 font-mono text-[11px] uppercase tracking-wider text-foreground whitespace-nowrap cursor-pointer hover:bg-accent transition-colors select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{col}</span>
                          {sortState?.colIdx === idx ? (
                            sortState.direction === "asc" ? (
                              <ArrowUp className="h-3 w-3 text-primary" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-30" />
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="p-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-border/50 transition-colors hover:bg-accent/40 group">
                      {row.map((cell, colIdx) => (
                        <td key={colIdx} className="p-2 border-r border-border/20 last:border-r-0">
                          <input
                            type="text"
                            value={cell}
                            onFocus={() => setActiveCell({ r: rowIdx, c: colIdx })}
                            onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                            className="w-full bg-transparent p-1 text-xs text-foreground font-mono focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary rounded"
                          />
                        </td>
                      ))}
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleDeleteRow(rowIdx)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 rounded transition-opacity"
                          title="Delete row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SheetsGen;
