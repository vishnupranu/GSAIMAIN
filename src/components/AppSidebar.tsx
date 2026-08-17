import { Home, MessageCircle, Compass, Code2, Image as ImageIcon, CreditCard, HelpCircle, LayoutDashboard, Bot, Shield, Users, Swords } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { icon: Code2, label: "Code", path: "/code" },
  { icon: Bot, label: "Agents", path: "/custom-agent" },
  { icon: Users, label: "Swarm", path: "/swarm" },
  { icon: Swords, label: "Arena", path: "/arena" },
  { icon: ImageIcon, label: "Image", path: "/image" },
  { icon: Compass, label: "Hub", path: "/agents" },
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: CreditCard, label: "Pricing", path: "/pricing" },
  { icon: HelpCircle, label: "Help", path: "/helpcenter" },
];

const AppSidebar = () => {
  const location = useLocation();
  const { config } = useUserRole();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-16 flex-col items-center justify-between border-r border-border bg-background py-4">
      <div className="flex flex-col items-center">
        <Link to="/" className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground shadow-sm" title="GUIDESOFT AI Workspace">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground" />
          </svg>
        </Link>

        <nav className="flex flex-col items-center gap-1">
          {navItems.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`group flex h-11 w-11 flex-col items-center justify-center rounded-xl text-xs transition-all ${
                  isActive
                    ? "bg-accent text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
                title={label}
              >
                <Icon className="mb-0.5 h-3.5 w-3.5" strokeWidth={1.8} />
                <span className="text-[8px] leading-tight">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Left Role Status Indicator */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={`h-2.5 w-2.5 rounded-full ring-2 ring-background ${
            config.badge === "ADMIN"
              ? "bg-red-500"
              : config.badge === "ENTERPRISE"
              ? "bg-purple-500"
              : config.badge === "PRO CREATOR"
              ? "bg-blue-500"
              : "bg-emerald-500"
          }`}
          title={`Active Workspace Authority: ${config.label}`}
        />
        <span className="text-[8px] font-mono font-bold text-muted-foreground uppercase">{config.badge.slice(0, 3)}</span>
      </div>
    </aside>
  );
};

export default AppSidebar;
