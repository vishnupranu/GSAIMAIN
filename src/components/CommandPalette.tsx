import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, MessageCircle, Code2, Presentation, Table2, FileText,
  Palette, Image as ImageIcon, Music, Video, Headphones, Settings2,
  Sparkles, CreditCard, HelpCircle, Building2, LayoutDashboard, ArrowRight
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface CommandItem {
  icon: any;
  label: string;
  category: "Studios" | "Actions" | "Pages";
  shortcut?: string;
  action: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const commands: CommandItem[] = [
    // Studios
    {
      icon: MessageCircle,
      label: "AI Chat Studio",
      category: "Studios",
      action: () => { navigate("/chat"); setOpen(false); },
    },
    {
      icon: Code2,
      label: "AI Developer Studio",
      category: "Studios",
      action: () => { navigate("/code"); setOpen(false); },
    },
    {
      icon: Presentation,
      label: "AI Slides Studio",
      category: "Studios",
      action: () => { navigate("/slides"); setOpen(false); },
    },
    {
      icon: Table2,
      label: "AI Sheets Studio",
      category: "Studios",
      action: () => { navigate("/sheets"); setOpen(false); },
    },
    {
      icon: FileText,
      label: "AI Docs Studio",
      category: "Studios",
      action: () => { navigate("/docs"); setOpen(false); },
    },
    {
      icon: Palette,
      label: "AI Designer Studio",
      category: "Studios",
      action: () => { navigate("/designer"); setOpen(false); },
    },
    {
      icon: ImageIcon,
      label: "AI Image Generator",
      category: "Studios",
      action: () => { navigate("/image"); setOpen(false); },
    },
    {
      icon: Music,
      label: "AI Music Synthesizer",
      category: "Studios",
      action: () => { navigate("/music"); setOpen(false); },
    },
    {
      icon: Video,
      label: "AI Video Storyboard Studio",
      category: "Studios",
      action: () => { navigate("/video"); setOpen(false); },
    },
    {
      icon: Headphones,
      label: "AI Meeting Notes",
      category: "Studios",
      action: () => { navigate("/meeting-notes"); setOpen(false); },
    },
    {
      icon: Settings2,
      label: "Custom Agent Builder",
      category: "Studios",
      action: () => { navigate("/custom-agent"); setOpen(false); },
    },
    {
      icon: Sparkles,
      label: "All 12 Agents Directory",
      category: "Studios",
      action: () => { navigate("/agents"); setOpen(false); },
    },

    // Actions
    {
      icon: CreditCard,
      label: "Upgrade to Pro Unlimited",
      category: "Actions",
      action: () => { navigate("/pricing"); setOpen(false); },
    },
    {
      icon: LayoutDashboard,
      label: "Admin Telemetry Dashboard",
      category: "Pages",
      action: () => { navigate("/dashboard"); setOpen(false); },
    },
    {
      icon: HelpCircle,
      label: "Help Center & Documentation",
      category: "Pages",
      action: () => { navigate("/helpcenter"); setOpen(false); },
    },
    {
      icon: Building2,
      label: "Enterprise Business Solutions",
      category: "Pages",
      action: () => { navigate("/business"); setOpen(false); },
    },
  ];

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        {/* Search Header */}
        <div className="flex items-center px-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground mr-3 flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or jump to studio (e.g. Chat, Slides, Code, Pricing)..."
            className="w-full py-3.5 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching studios or actions found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={idx}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors text-left ${
                    isSelected
                      ? "bg-accent text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg border border-border ${isSelected ? "bg-background text-foreground" : "bg-card text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span>{cmd.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                    {cmd.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground bg-muted/20">
          <div className="flex items-center gap-2 font-mono">
            <span>↑↓ Navigate</span>
            <span>•</span>
            <span>↵ Select</span>
            <span>•</span>
            <span>Esc Close</span>
          </div>
          <span className="font-mono">GUIDESOFT Workspace</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CommandPalette;
