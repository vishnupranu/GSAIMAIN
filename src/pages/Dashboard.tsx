import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { MessageCircle, Image, Code2, Save, Trash2, Cpu, Activity, Zap } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import { fetchStats, fetchProviders, type BackendStats, type ProviderStatus } from "@/lib/api";

const PROFILE_KEY = "guidesoft_profile";

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : { display_name: "", avatar_url: "" };
  } catch {
    return { display_name: "", avatar_url: "" };
  }
}

function saveProfile(profile: { display_name: string; avatar_url: string }) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { conversations, deleteConversation, getStats } = useConversations();
  const [profile, setProfile] = useState(loadProfile);
  const [saving, setSaving] = useState(false);
  const [backendStats, setBackendStats] = useState<BackendStats | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);

  const localStats = getStats();

  useEffect(() => {
    fetchStats().then(setBackendStats);
    fetchProviders().then(setProviderStatus);
  }, []);

  const handleSaveProfile = () => {
    setSaving(true);
    setTimeout(() => {
      saveProfile(profile);
      setSaving(false);
      toast.success("Profile updated");
    }, 300);
  };

  const handleDeleteConversation = (id: string) => {
    deleteConversation(id);
    toast.success("Conversation deleted");
  };

  const stats = [
    {
      icon: MessageCircle,
      label: "Conversations",
      value: localStats.conversations,
      color: "text-blue-500",
    },
    {
      icon: MessageCircle,
      label: "Messages",
      value: localStats.messages,
      color: "text-green-500",
    },
    {
      icon: Code2,
      label: "Code Sessions",
      value: localStats.codeSessions,
      color: "text-purple-500",
    },
    {
      icon: Image,
      label: "Images Generated",
      value: localStats.imagesGenerated,
      color: "text-orange-500",
    },
  ];

  const recentConversations = [...conversations].slice(0, 20);

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">GUIDESOFT AI Workspace</p>
        </motion.div>

        {/* Usage Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-4">
                <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Backend Stats */}
        {backendStats && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Backend Stats</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                Uptime: {Math.floor(backendStats.uptime_seconds / 60)}m {Math.floor(backendStats.uptime_seconds % 60)}s
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{backendStats.total_chat_requests}</p>
                <p className="text-xs text-muted-foreground">Chat Requests</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{backendStats.total_image_requests}</p>
                <p className="text-xs text-muted-foreground">Image Requests</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{backendStats.total_search_requests}</p>
                <p className="text-xs text-muted-foreground">Search Requests</p>
              </div>
            </div>
            {Object.keys(backendStats.requests_by_provider).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">By Provider</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(backendStats.requests_by_provider).map(([provider, count]) => (
                    <span
                      key={provider}
                      className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground"
                    >
                      {provider}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Provider Status */}
        {providerStatus && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Provider Status</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(providerStatus.providers).map(([name, enabled]) => (
                <span
                  key={name}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
                    enabled
                      ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-green-500" : "bg-muted-foreground"}`} />
                  {name}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Profile Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Profile Settings</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Display Name</label>
              <Input
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Avatar URL</label>
              <Input
                value={profile.avatar_url}
                onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="mt-4 gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </Card>

        {/* Recent Conversations */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Conversations</h2>
          {recentConversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversations yet. Start chatting!</p>
          ) : (
            <div className="space-y-2">
              {recentConversations.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => navigate(`/chat?id=${c.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MessageCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.model} • {new Date(c.updatedAt).toLocaleDateString()} • {c.messages.length} messages
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(c.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
