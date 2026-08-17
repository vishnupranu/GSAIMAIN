import { useState } from "react";
import { motion } from "framer-motion";
import {
  Table2, Sparkles, Download, Copy, Check, Plus,
  Trash2, ArrowUpDown, RefreshCw, FileSpreadsheet, Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import ModelSelector, { type ModelId } from "@/components/ModelSelector";
import { streamChat } from "@/lib/api";

interface SheetData {
  title: string;
  description: string;
  columns: string[];
  rows: (string | number)[][];
  summaryMetrics?: { label: string; value: string }[];
}

const TEMPLATES = [
  "SaaS 5-Year Financial Model (ARR, Churn, CAC, LTV)",
  "Quarterly Marketing Campaign ROI & Conversion Rates",
  "Startup Cap Table & Equity Ownership Distribution",
  "Engineering Sprint Planning & Velocity Tracker",
  "E-Commerce Product Inventory & Profit Margin Matrix"
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

const SheetsGen = () => {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ModelId>("google/gemini-3-flash-preview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sheet, setSheet] = useState<SheetData>(DEFAULT_SHEET);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
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
}
Do not include any markdown formatting or extra conversational text outside the JSON.`;

    let accumulated = "";

    try {
      await streamChat({
        messages: [{ role: "user", content: `Generate spreadsheet: ${prompt}` }],
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
            } else {
              throw new Error("Invalid structure");
            }
          } catch {
            toast.error("Failed to parse sheet data. Try refining your prompt.");
          }
        },
      });
    } catch (e: any) {
      setIsGenerating(false);
      toast.error(e.message || "Failed to generate spreadsheet");
    }
  };

  const handleCellChange = (rowIndex: number, colIndex: number, val: string) => {
    const newRows = sheet.rows.map((row, rIdx) =>
      rIdx === rowIndex ? row.map((cell, cIdx) => (cIdx === colIndex ? val : cell)) : row
    );
    setSheet({ ...sheet, rows: newRows });
  };

  const handleAddRow = () => {
    const emptyRow = sheet.columns.map(() => "");
    setSheet({ ...sheet, rows: [...sheet.rows, emptyRow] });
    toast.success("Row added");
  };

  const handleDeleteRow = (idx: number) => {
    const newRows = sheet.rows.filter((_, i) => i !== idx);
    setSheet({ ...sheet, rows: newRows });
  };

  const handleExportCSV = () => {
    const csvContent = [
      sheet.columns.join(","),
      ...sheet.rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(sheet.title || "sheet").replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Spreadsheet exported as CSV!");
  };

  const handleCopy = () => {
    const tsv = [
      sheet.columns.join("\t"),
      ...sheet.rows.map((r) => r.join("\t")),
    ].join("\n");
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard (pasteable into Excel/Sheets)!");
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
        {/* Header / Prompt Bar */}
        <div className="border-b border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-primary-foreground">
                <Table2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">AI Spreadsheet Studio</h1>
                <p className="text-[11px] text-muted-foreground">Automated financial models, dataset grids, formulas, and metric calculations</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleAddRow} className="h-8 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Row
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 gap-1.5 text-xs">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy Data
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
              placeholder="Describe the spreadsheet or dataset to generate..."
              className="flex-1 min-w-[280px] h-9 text-xs"
            />
            <div className="w-48">
              <ModelSelector value={model} onChange={setModel} />
            </div>
            <Button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} className="h-9 gap-1.5 text-xs">
              {isGenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate Sheet
            </Button>
          </div>

          {/* Quick template chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase flex-shrink-0">Examples:</span>
            {TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onClick={() => setPrompt(tpl)}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex-shrink-0"
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>

        {/* Sheet Content Workspace */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/10">
          {/* Sheet Title & Summary Cards */}
          <div>
            <h2 className="text-xl font-bold text-foreground">{sheet.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{sheet.description}</p>

            {sheet.summaryMetrics && sheet.summaryMetrics.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {sheet.summaryMetrics.map((metric, i) => (
                  <Card key={i} className="p-3.5 border-border bg-card">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <Calculator className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium">{metric.label}</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{metric.value}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Data Table Grid */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                    <th className="w-10 px-3 py-2.5 text-center font-semibold border-r border-border">#</th>
                    {sheet.columns.map((col, cIdx) => (
                      <th key={cIdx} className="px-4 py-2.5 font-semibold text-foreground border-r border-border last:border-r-0">
                        {col}
                      </th>
                    ))}
                    <th className="w-12 px-2 py-2.5 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sheet.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-accent/40 transition-colors group">
                      <td className="px-3 py-2 text-center text-[10px] text-muted-foreground font-mono bg-muted/20 border-r border-border">
                        {rIdx + 1}
                      </td>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-2 py-1.5 border-r border-border last:border-r-0">
                          <input
                            value={String(cell)}
                            onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                            className="w-full bg-transparent px-2 py-1 text-xs text-foreground focus:outline-none focus:bg-background focus:ring-1 focus:ring-foreground rounded"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => handleDeleteRow(rIdx)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
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
