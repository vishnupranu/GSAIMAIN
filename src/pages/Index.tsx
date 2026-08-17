import {
  Settings2, Presentation, Table2, FileText, Code2,
  Palette, MessageCircle, Image as ImageIcon, Music, Video,
  Headphones, Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SearchBar from "@/components/SearchBar";
import ToolCard from "@/components/ToolCard";
import AppFooter from "@/components/AppFooter";

const Index = () => {
  const navigate = useNavigate();

  const tools = [
    { icon: Settings2, label: "Custom Agent", path: "/custom-agent" },
    { icon: Presentation, label: "AI Slides", path: "/slides" },
    { icon: Table2, label: "AI Sheets", path: "/sheets" },
    { icon: FileText, label: "AI Docs", path: "/docs" },
    { icon: Code2, label: "AI Developer", path: "/code" },
    { icon: Palette, label: "AI Designer", path: "/designer" },
    { icon: MessageCircle, label: "AI Chat", badge: "Unlimited", path: "/chat" },
    { icon: ImageIcon, label: "AI Image", badge: "Unlimited", path: "/image" },
    { icon: Music, label: "AI Music", path: "/music" },
    { icon: Video, label: "AI Video", path: "/video" },
    { icon: Headphones, label: "AI Meeting Notes", path: "/meeting-notes" },
    { icon: Sparkles, label: "All Agents", path: "/agents" },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col items-center px-4 sm:px-6 pt-12 sm:pt-16">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center text-3xl sm:text-4xl font-semibold tracking-tight text-foreground"
        >
          GUIDESOFT
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full"
        >
          <SearchBar />
        </motion.div>

        {/* 12 Functional AI Tool Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mx-auto mt-8 sm:mt-12 grid w-full max-w-4xl grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12 sm:gap-2"
        >
          {tools.map((tool) => (
            <ToolCard
              key={tool.label}
              icon={tool.icon}
              label={tool.label}
              badge={tool.badge}
              onClick={() => navigate(tool.path)}
            />
          ))}
        </motion.div>

        {/* Speakly Voice / Meeting Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mx-auto mt-10 w-full max-w-2xl rounded-2xl border border-border bg-card p-4 sm:p-5"
        >
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-foreground">
              <Headphones className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm sm:text-base font-semibold text-foreground">
                Don't type, just Speakly
              </h3>
              <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                AI turns your speech into clear and polished meeting notes, emails, and deliverables.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => navigate("/meeting-notes")}
                  className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Start Speaking
                </button>
                <button
                  onClick={() => navigate("/agents")}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Explore All Studios
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="mt-16">
        <AppFooter />
      </div>
    </AppLayout>
  );
};

export default Index;
