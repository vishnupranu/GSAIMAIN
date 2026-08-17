import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, Compass, MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404 Error: Non-existent route requested:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mx-auto max-w-md space-y-4">
        <span className="rounded-full bg-accent border border-border px-3.5 py-1 text-xs font-mono font-bold text-foreground">
          404 ERROR
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight font-heading">
          Page Not Found
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          The path <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">{location.pathname}</code> does not exist or has been moved.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link to="/">
            <Button className="h-10 gap-2 text-xs font-semibold rounded-xl">
              <Home className="h-4 w-4" /> Return Home
            </Button>
          </Link>
          <Link to="/agents">
            <Button variant="outline" className="h-10 gap-2 text-xs font-semibold rounded-xl">
              <Compass className="h-4 w-4" /> Explore Studios
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
