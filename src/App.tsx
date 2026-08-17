import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Agents from "./pages/Agents";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import CodeGen from "./pages/CodeGen";
import ImageGen from "./pages/ImageGen";
import CustomAgent from "./pages/CustomAgent";
import Swarm from "./pages/Swarm";
import Arena from "./pages/Arena";
import SlidesGen from "./pages/SlidesGen";
import SheetsGen from "./pages/SheetsGen";
import DocsGen from "./pages/DocsGen";
import DesignerGen from "./pages/DesignerGen";
import MusicGen from "./pages/MusicGen";
import VideoGen from "./pages/VideoGen";
import MeetingNotes from "./pages/MeetingNotes";
import Pricing from "./pages/Pricing";
import HelpCenter from "./pages/HelpCenter";
import Business from "./pages/Business";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/code" element={<CodeGen />} />
          <Route path="/image" element={<ImageGen />} />
          <Route path="/custom-agent" element={<CustomAgent />} />
          <Route path="/swarm" element={<Swarm />} />
          <Route path="/arena" element={<Arena />} />
          <Route path="/slides" element={<SlidesGen />} />
          <Route path="/sheets" element={<SheetsGen />} />
          <Route path="/docs" element={<DocsGen />} />
          <Route path="/designer" element={<DesignerGen />} />
          <Route path="/music" element={<MusicGen />} />
          <Route path="/video" element={<VideoGen />} />
          <Route path="/meeting-notes" element={<MeetingNotes />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/helpcenter" element={<HelpCenter />} />
          <Route path="/business" element={<Business />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
