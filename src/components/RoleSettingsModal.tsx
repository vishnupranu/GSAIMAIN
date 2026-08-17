import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, Check, User, Key, Building2, Crown, Sparkles,
  Lock, Copy, CheckCircle2, RefreshCw, X
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUserRole, type UserRole, ROLE_CONFIG, ROLE_PERMISSIONS } from "@/hooks/useUserRole";

interface RoleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoleSettingsModal({ isOpen, onClose }: RoleSettingsModalProps) {
  const { role, setRole, permissions, config } = useUserRole();
  const [apiKey, setApiKey] = useState("gsk_live_" + Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join(""));
  const [copiedKey, setCopiedKey] = useState(false);

  const roles: UserRole[] = ["admin", "enterprise", "creator", "member", "guest"];

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast.success("API key copied to clipboard!");
  };

  const handleRegenerateKey = () => {
    const newKey = "gsk_live_" + Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
    setApiKey(newKey);
    toast.success("New API key generated!");
  };

  const permissionItems = [
    { key: "canAccessAdminDashboard", label: "Admin Telemetry & Real-Time Audit Logs", desc: "View system usage, active model connections, and provider latency" },
    { key: "canUseUnlimitedAI", label: "Unlimited Multi-Model Generative AI", desc: "No daily rate limits on Gemini, Claude 3.5 Sonnet, GPT-4o, and Llama 3.2" },
    { key: "canCreateCustomAgents", label: "Autonomous Custom Agent Builder & Roster", desc: "Create, customize, and deploy tailored AI agent personas" },
    { key: "canExportHighRes", label: "High-Res 4K Media & Raster PNG Export", desc: "Export crisp vector art, charts, documents, and slides" },
    { key: "canAccessAPIKeys", label: "Universal API Key & MCP Tool Execution", desc: "Programmatic access to internal tool calling endpoints" },
    { key: "canManageTeam", label: "Multi-Seat Team & Organization Management", desc: "Invite members and configure granular tenant permissions" },
    { key: "canManageBilling", label: "Enterprise Billing & Payment Webhooks", desc: "Manage GPay, UPI, and Card subscriptions" },
  ] as const;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <DialogTitle className="sr-only">User Roles & Permissions</DialogTitle>
        
        {/* Header */}
        <div className="border-b border-border bg-muted/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-primary-foreground">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground font-heading">User Roles & Permissions</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${config.color}`}>
                    {config.badge}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Role-Based Access Control (RBAC) & Organization Authority</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
          {/* Role Switcher */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 block">
              Switch Active User Role
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {roles.map((r) => {
                const conf = ROLE_CONFIG[r];
                const isSelected = role === r;
                return (
                  <button
                    key={r}
                    onClick={() => {
                      setRole(r);
                      toast.success(`Role switched to ${conf.label}!`);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-card/60 hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground">{conf.label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{conf.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Permissions Matrix */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 block">
              Active Role Permissions Matrix ({role.toUpperCase()})
            </label>
            <div className="rounded-2xl border border-border bg-background p-3 space-y-2">
              {permissionItems.map((item) => {
                const isGranted = !!permissions[item.key];
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                        {item.label}
                      </span>
                      <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${
                        isGranted
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20"
                      }`}
                    >
                      {isGranted ? "GRANTED" : "RESTRICTED"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* API Key Management */}
          {permissions.canAccessAPIKeys && (
            <div className="rounded-2xl border border-border bg-muted/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Key className="h-4 w-4 text-primary" />
                  <span>Universal Agent API Key</span>
                </div>
                <Button size="sm" variant="ghost" onClick={handleRegenerateKey} className="h-6 text-[11px] gap-1">
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={apiKey}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 font-mono text-xs text-foreground focus:outline-none"
                />
                <Button size="sm" variant="outline" onClick={handleCopyKey} className="h-8 gap-1.5 text-xs rounded-xl">
                  {copiedKey ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />} Copy
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/20 px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Enterprise SAIF Compliant • Multi-Tenant RBAC</span>
          <Button onClick={onClose} size="sm" className="rounded-xl px-4 text-xs">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RoleSettingsModal;
