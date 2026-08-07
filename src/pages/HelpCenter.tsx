import { Search, BookOpen, MessageCircle, Mail, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AppFooter from "@/components/AppFooter";
import { Input } from "@/components/ui/input";

const categories = [
  { icon: BookOpen, title: "Getting Started", desc: "Learn the basics of Genspark AI Workspace", articles: 12 },
  { icon: MessageCircle, title: "AI Agents", desc: "How to use and configure AI agents", articles: 8 },
  { icon: Mail, title: "Account & Billing", desc: "Manage your account and subscriptions", articles: 6 },
];

const faqs = [
  { q: "How do I create a custom agent?", a: "Navigate to the Custom Agent tool from the home page and follow the guided setup wizard." },
  { q: "What's included in the Free plan?", a: "The Free plan includes 5 AI chats per day, basic agents, and 1 project." },
  { q: "How do I cancel my subscription?", a: "Go to Settings → Billing → Cancel subscription. Your access continues until the end of the billing period." },
  { q: "Can I export my work?", a: "Yes! All documents, slides, and sheets can be exported in multiple formats including PDF, PPTX, and XLSX." },
];

const HelpCenter = () => {
  const [search, setSearch] = useState("");

  return (
    <AppLayout>
      <div className="px-4 py-12 sm:px-8 sm:py-16">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">How can we help?</h1>
          <div className="relative mt-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for help articles..."
              className="pl-10"
            />
          </div>
        </motion.div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-3">
          {categories.map((cat, i) => (
            <motion.button
              key={cat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-5 text-left transition-shadow hover:card-shadow-hover"
            >
              <cat.icon className="h-6 w-6 text-foreground" />
              <h3 className="mt-3 font-semibold text-foreground">{cat.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{cat.desc}</p>
              <p className="mt-2 text-xs text-muted-foreground">{cat.articles} articles</p>
            </motion.button>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <h2 className="mb-6 text-xl font-bold text-foreground">Frequently asked questions</h2>
          <div className="space-y-3">
            {faqs
              .filter((f) => !search || f.q.toLowerCase().includes(search.toLowerCase()))
              .map((faq) => (
                <details key={faq.q} className="group rounded-xl border border-border bg-card p-4">
                  <summary className="flex cursor-pointer items-center justify-between font-medium text-foreground">
                    {faq.q}
                    <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
                </details>
              ))}
          </div>
        </div>
      </div>
      <AppFooter />
    </AppLayout>
  );
};

export default HelpCenter;
