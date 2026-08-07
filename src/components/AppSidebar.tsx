import { Home, MessageCircle, Compass, Code2, Image, CreditCard, HelpCircle, LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { icon: Code2, label: "Code", path: "/code" },
  { icon: Image, label: "Image", path: "/image" },
  { icon: Compass, label: "Hub", path: "/agents" },
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: CreditCard, label: "Pricing", path: "/pricing" },
  { icon: HelpCircle, label: "Help", path: "/helpcenter" },
];

const AppSidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-16 flex-col items-center border-r border-border bg-background py-4">
      <Link to="/" className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-foreground">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground" />
        </svg>
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`group flex h-14 w-14 flex-col items-center justify-center rounded-xl text-xs transition-colors ${
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="mb-0.5 h-5 w-5" strokeWidth={1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default AppSidebar;
