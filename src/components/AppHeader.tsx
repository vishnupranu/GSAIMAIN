import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, User, Search, Shield, Settings } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import RoleSettingsModal from "./RoleSettingsModal";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

const AppHeader = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const { role, config } = useUserRole();

  const openCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  return (
    <>
      <header className="flex h-14 items-center justify-between gap-3 px-4 md:px-6">
        <button
          onClick={openCommandPalette}
          className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search studios or actions...</span>
          <span className="inline sm:hidden">Search...</span>
          <kbd className="hidden sm:inline-flex h-4 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-2.5">
          {/* Universal Role Badge Trigger */}
          <button
            onClick={() => setIsRoleModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold uppercase border transition-all hover:opacity-80 ${config.color}`}
            title="Manage Roles & Permissions"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>{config.badge}</span>
          </button>

          <ThemeToggle />

          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="rounded-full gap-1.5">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="outline" size="sm" className="rounded-full px-5 text-sm font-medium">
                  Sign in
                </Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button variant="ghost" size="sm" className="rounded-full px-5 text-sm font-medium">
                  Sign up
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Universal Roles & Permissions Modal */}
      <RoleSettingsModal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} />
    </>
  );
};

export default AppHeader;
