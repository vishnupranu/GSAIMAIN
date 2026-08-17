import { useState, useRef } from "react";
import {
  Download, Upload, HardDrive, CheckCircle2, AlertTriangle,
  RefreshCw, FileJson, Shield, Check
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackupRestoreModal({ isOpen, onClose }: BackupRestoreModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportAll = () => {
    setIsExporting(true);
    try {
      const backup = {
        version: "2.0",
        workspace: "GUIDESOFT AI Workspace",
        exportedAt: new Date().toISOString(),
        data: {
          customAgents: localStorage.getItem("guidesoft_custom_agents"),
          conversations: localStorage.getItem("guidesoft_conversations"),
          userRole: localStorage.getItem("guidesoft_user_role"),
          profile: localStorage.getItem("guidesoft_profile"),
          codeBlueprints: localStorage.getItem("guidesoft_code_blueprints"),
        },
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `guidesoft_workspace_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
      toast.success("Full workspace backup downloaded successfully!");
    } catch (e: any) {
      setIsExporting(false);
      toast.error("Failed to generate backup: " + e.message);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed.data) {
          throw new Error("Invalid backup file structure: missing data payload");
        }

        // Restore keys safely
        if (parsed.data.customAgents) {
          localStorage.setItem("guidesoft_custom_agents", parsed.data.customAgents);
        }
        if (parsed.data.conversations) {
          localStorage.setItem("guidesoft_conversations", parsed.data.conversations);
        }
        if (parsed.data.userRole) {
          localStorage.setItem("guidesoft_user_role", parsed.data.userRole);
        }
        if (parsed.data.profile) {
          localStorage.setItem("guidesoft_profile", parsed.data.profile);
        }

        setIsImporting(false);
        toast.success("Workspace restored successfully! Reloading state...");
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } catch (err: any) {
        setIsImporting(false);
        toast.error("Restore failed: " + err.message);
      }
    };

    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <DialogTitle className="sr-only">Workspace Backup & Restore</DialogTitle>

        <div className="border-b border-border bg-muted/20 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-primary-foreground">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground font-heading">Workspace Backup & Migration</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Export or restore full local sessions, custom agents, and roles</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Export Card */}
          <div className="rounded-2xl border border-border bg-background p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Export Full Archive</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                READY
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Bundles all your custom agents, chat conversation histories, slide decks, and role configurations into a portable JSON snapshot.
            </p>
            <Button
              onClick={handleExportAll}
              disabled={isExporting}
              className="w-full h-9 text-xs rounded-xl gap-2 font-semibold"
            >
              <Download className="h-4 w-4" /> {isExporting ? "Packaging..." : "Download Workspace Backup (.json)"}
            </Button>
          </div>

          {/* Import Card */}
          <div className="rounded-2xl border border-border bg-background p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-bold text-foreground">Restore from Backup</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">JSON Schema v2.0</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload a previously exported GUIDESOFT JSON backup file to instantly restore your workspace state.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full h-9 text-xs rounded-xl gap-2 font-semibold"
            >
              <Upload className="h-4 w-4" /> {isImporting ? "Restoring..." : "Upload & Restore Backup"}
            </Button>
          </div>
        </div>

        <div className="border-t border-border bg-muted/20 px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Zero-Knowledge Local Storage Sync</span>
          <Button onClick={onClose} size="sm" variant="ghost" className="rounded-xl px-4 text-xs">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BackupRestoreModal;
