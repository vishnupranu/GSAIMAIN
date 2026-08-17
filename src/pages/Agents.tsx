import { useState } from "react";
import {
  Settings2, Presentation, Table2, FileText, Code2,
  Palette, Camera, Film, Headphones, Search,
  ShieldCheck, Music, Video, Sparkles, MessageCircle, Image as ImageIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import AgentCard from "@/components/AgentCard";

const ALL_AGENTS = [
  {
    icon: Settings2,
    title: "Custom Agent Builder",
    routeTo: "custom-agent",
    category: "Agents",
    badge: "Featured",
    tasks: [
      "Create a tailored Senior Software Architect agent",
      "Build a Growth Marketing & SEO copywriting bot",
    ],
  },
  {
    icon: Presentation,
    title: "AI Slides",
    routeTo: "slides",
    category: "Productivity",
    tasks: [
      "Create a 10-slide pitch deck for an AI Developer Copilot",
      "Generate Bauhaus Design principles presentation",
    ],
  },
  {
    icon: Table2,
    title: "AI Sheets",
    routeTo: "sheets",
    category: "Productivity",
    tasks: [
      "Compile a 5-Year SaaS Financial Projection Model",
      "Build a Marketing ROI & Conversion Rate Matrix",
    ],
  },
  {
    icon: FileText,
    title: "AI Docs",
    routeTo: "docs",
    category: "Productivity",
    tasks: [
      "Draft a Product Requirements Document (PRD) for Mobile App",
      "Write an Executive Resume & Professional Biography",
    ],
  },
  {
    icon: Code2,
    title: "AI Developer",
    routeTo: "code",
    category: "Engineering",
    badge: "Unlimited",
    tasks: [
      "Build a playable Retro Arcade Web Game in HTML/CSS/JS",
      "Create a Python FastAPI CRUD Backend with Auth",
    ],
  },
  {
    icon: Palette,
    title: "AI Designer",
    routeTo: "designer",
    category: "Design",
    tasks: [
      "Design a futuristic vector SVG cyber logo & icon",
      "Create a modern glassmorphic UI card wireframe",
    ],
  },
  {
    icon: MessageCircle,
    title: "AI Chat",
    routeTo: "chat",
    category: "General",
    badge: "Unlimited",
    tasks: [
      "Ask anything with multi-model provider orchestration",
      "Analyze and solve complex multi-step reasoning problems",
    ],
  },
  {
    icon: ImageIcon,
    title: "AI Image",
    routeTo: "image",
    category: "Design",
    badge: "Unlimited",
    tasks: [
      "A futuristic cyberpunk skyline at sunset with flying cars",
      "A serene Japanese zen garden with blooming cherry blossoms",
    ],
  },
  {
    icon: Music,
    title: "AI Music",
    routeTo: "music",
    category: "Media",
    badge: "New",
    tasks: [
      "Compose an 80s Retro Synthwave track with synth preview",
      "Generate Lo-Fi Study Chillhop lyrics and chord progressions",
    ],
  },
  {
    icon: Video,
    title: "AI Video",
    routeTo: "video",
    category: "Media",
    badge: "New",
    tasks: [
      "Produce a Sci-Fi cinematic storyboard with camera directions",
      "Create a 30-second product commercial script & voiceover",
    ],
  },
  {
    icon: Headphones,
    title: "AI Meeting Notes",
    routeTo: "meeting-notes",
    category: "Productivity",
    tasks: [
      "Live microphone speech-to-text dictation & executive recap",
      "Extract action items, decisions, and ready-to-send email",
    ],
  },
  {
    icon: Search,
    title: "Deep Research",
    routeTo: "chat",
    category: "Research",
    tasks: [
      "Analyze complex social structures of Pacific orcas",
      "Evolution of serve techniques in professional tennis 2000-2025",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Fact Check",
    routeTo: "chat",
    category: "Research",
    tasks: [
      "Fact-check claims regarding AI job market trends in 2030",
      "Verify scientific consensus on renewable energy efficiency",
    ],
  },
];

const CATEGORIES = ["All", "Productivity", "Engineering", "Design", "Media", "Agents", "Research"];

const Agents = () => {
  const [selectedCat, setSelectedCat] = useState("All");
  const [search, setSearch] = useState("");

  const filteredAgents = ALL_AGENTS.filter((agent) => {
    const matchesCat = selectedCat === "All" || agent.category === selectedCat;
    const matchesSearch =
      agent.title.toLowerCase().includes(search.toLowerCase()) ||
      agent.tasks.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              <span>Advanced Agents & Studios Hub</span>
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Autonomous workspaces and specialized AI engines ready to generate deliverables instantly.
            </p>
          </div>

          <div className="w-72">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents & studios..."
              className="text-xs h-9"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={selectedCat === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCat(cat)}
              className="h-8 text-xs font-semibold rounded-lg"
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Agents Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.title} {...agent} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Agents;
