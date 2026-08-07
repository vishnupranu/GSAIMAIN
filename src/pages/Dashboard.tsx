import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { User, MessageCircle, Image, Code2, Settings, Trash2, Save } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string }>({
    display_name: "",
    avatar_url: "",
  });
  const [stats, setStats] = useState({ conversations: 0, messages: 0 });
  const [conversations, setConversations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadProfile(session.user.id);
      loadStats(session.user.id);
      loadConversations(session.user.id);
    });
  }, []);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("user_id", uid).single();
    if (data) setProfile({ display_name: data.display_name || "", avatar_url: data.avatar_url || "" });
  };

  const loadStats = async (uid: string) => {
    const { count: convCount } = await supabase.from("conversations").select("*", { count: "exact", head: true }).eq("user_id", uid);
    const { data: convIds } = await supabase.from("conversations").select("id").eq("user_id", uid);
    let msgCount = 0;
    if (convIds?.length) {
      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convIds.map((c) => c.id));
      msgCount = count || 0;
    }
    setStats({ conversations: convCount || 0, messages: msgCount });
  };

  const loadConversations = async (uid: string) => {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false })
      .limit(20);
    setConversations(data || []);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: profile.display_name, avatar_url: profile.avatar_url })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error("Failed to save profile");
    else toast.success("Profile updated");
  };

  const deleteConversation = async (id: string) => {
    await supabase.from("chat_messages").delete().eq("conversation_id", id);
    await supabase.from("conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (user) loadStats(user.id);
    toast.success("Conversation deleted");
  };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: MessageCircle, label: "Conversations", value: stats.conversations },
            { icon: MessageCircle, label: "Messages", value: stats.messages },
            { icon: Code2, label: "Code Sessions", value: "—" },
            { icon: Image, label: "Images Generated", value: "—" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-4">
                <s.icon className="h-5 w-5 text-muted-foreground mb-2" />
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Profile Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-muted-foreground" />
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
          <Button onClick={saveProfile} disabled={saving} className="mt-4 gap-2">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Profile"}
          </Button>
        </Card>

        {/* Recent Conversations */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Conversations</h2>
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversations yet. Start chatting!</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => navigate(`/chat?id=${c.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MessageCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                      <p className="text-[10px] text-muted-foreground">{c.model} • {new Date(c.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
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
