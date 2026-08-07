import {
  Settings2, Presentation, Table2, FileText, Code2,
  Palette, Camera, Film, Headphones, Search,
  ShieldCheck, Phone, Download
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AgentCard from "@/components/AgentCard";

const agents = [
  {
    icon: Settings2,
    title: "Genspark Super Agent",
    tasks: [
      "Plan Travel to San Diego & AI Call for Me to Make Reservation",
      "AI Call for Me to Make Restaurant Reservation",
    ],
  },
  {
    icon: Presentation,
    title: "AI Slides",
    tasks: [
      "Understanding Bauhaus Design: Principles and Real-World Applications.",
      "Popular Music Trends 2025.",
    ],
  },
  {
    icon: Table2,
    title: "AI Sheets",
    tasks: [
      "NVIDIA Financial Statements Compilation 2021-2025",
      "Supabase Sales Share Subcategory Analysis October 2025",
    ],
  },
  {
    icon: FileText,
    title: "AI Docs",
    tasks: [
      "Create a resume for John Doe",
      "Create a user survey for Genspark",
    ],
  },
  {
    icon: Code2,
    title: "AI Developer",
    tasks: [
      "Build a Super Mario Web Game.",
      "Build a booking website for a salon.",
    ],
  },
  {
    icon: Palette,
    title: "AI Designer",
    tasks: [
      "Design a product poster for my canned coffee",
      "Create a PopMart-style figure based on my brand style.",
    ],
  },
  {
    icon: Camera,
    title: "Photo Genius",
    badge: "New",
    tasks: [
      "Change my hairstyle to long wavy hair",
      "Put me in front of the Eiffel Tower in Paris",
    ],
  },
  {
    icon: Film,
    title: "Clip Genius",
    tasks: [
      "Edit the video into a highlight focusing only on the LA Dodgers team.",
      "Cut kill highlights from these three LOL videos into one",
    ],
  },
  {
    icon: Headphones,
    title: "AI Pods",
    tasks: [
      "Create a podcast summarizing this week's major AI industry news",
      "Create a podcast explaining this paper",
    ],
  },
  {
    icon: Search,
    title: "Deep Research",
    tasks: [
      "Complex Social Structures of Orcas in the Pacific Northwest",
      "The Evolution of Serve Techniques in Professional Tennis Over the Past 20 Years",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Fact Check",
    tasks: [
      "Coca-Cola cut ties with Taylor Swift over her political endorsement.",
      'The new "5-Day Fast Diet" trending on social media guarantees 10kg weight loss in a month without exercise.',
    ],
  },
  {
    icon: Phone,
    title: "Call For Me",
    tasks: [
      "Book a table at Lechon for next Wednesday's birthday celebration",
      "Check if BusterPro Tennis has Yonex 2025 EZONE tennis racket in stock",
    ],
  },
  {
    icon: Download,
    title: "Download For Me",
    tasks: [
      "Download papers mentioned in a LinkedIn link",
      "Download videos from Genspark's Korean Tiktok",
    ],
  },
];

const Agents = () => {
  return (
    <AppLayout>
      <div className="px-8 py-8">
        <h1 className="text-2xl font-bold text-foreground">Advanced Agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Work autonomously on your complex tasks.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agents.map((agent) => (
            <AgentCard key={agent.title} {...agent} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Agents;
