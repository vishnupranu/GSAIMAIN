import { ReactNode, useState } from "react";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import { Menu, X } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-card text-foreground shadow-md md:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed z-40 transition-transform duration-200 md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:block`}>
        <AppSidebar />
      </div>

      <div className="flex flex-1 flex-col pl-0 md:pl-16">
        <AppHeader />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
