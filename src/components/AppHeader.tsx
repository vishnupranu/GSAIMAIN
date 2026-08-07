import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, User } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { toast } from "sonner";

const AppHeader = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

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
    <header className="flex h-14 items-center justify-end gap-3 px-4 md:px-6">
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
    </header>
  );
};

export default AppHeader;
