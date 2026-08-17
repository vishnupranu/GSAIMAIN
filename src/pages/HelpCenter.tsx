import { Search, BookOpen, MessageCircle, Mail, ChevronRight, Sparkles, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import AppFooter from "@/components/AppFooter";
import { Input } from "@/components/ui/input";

const categories = [
  { icon: BookOpen, title: "Getting Started", desc: "Learn how to use all 12 AI Studios in GUIDESOFT", articles: 12 },
  { icon: Sparkles, title: "Autonomous Agents", desc: "How to configure, deploy, and test custom AI agents", articles: 8 },
  { icon: Mail, title: "Billing & Payments", desc: "Google Pay, UPI, Cards, and invoice receipts", articles: 6 },
];

const faqs = [
  {
    q: "What payment methods are supported on GUIDESOFT?",
    a: "We support Google Pay (GPay), instant UPI QR code payments (Google Pay, PhonePe, Paytm, BHIM), and all major Credit & Debit cards (Visa, Mastercard, RuPay, Amex) with 256-bit SSL encryption."
  },
  {
    q: "Can I use GUIDESOFT completely offline without third-party API keys?",
    a: "Yes! GUIDESOFT is integrated with local Ollama models (Llama 3.2, Mistral, Qwen, DeepSeek) out of the box with zero external API dependencies required."
  },
  {
    q: "How do I create and deploy a custom AI agent?",
    a: "Open the Custom Agent Studio from the top navigation. Set your agent's name, role, custom system prompt instructions, toggle capabilities, and test it in real time in the interactive playground."
  },
  {
    q: "What formats can I export my presentations, sheets, and documents in?",
    a: "AI Slides can be exported as standalone HTML presentations and Markdown. AI Sheets can be exported as CSV or copied directly into Excel/Google Sheets. AI Docs can be downloaded as Markdown (.md) or copied."
  },
  {
    q: "How do I cancel or modify my subscription?",
    a: "You can manage your plan from your Dashboard. Subscriptions can be upgraded, downgraded, or cancelled with one click at any time without penalty."
  },
];

const HelpCenter = () => {
  const [search, setSearch] = useState("");

  return (
    <AppLayout>
      <div className="px-4 py-12 sm:px-8 sm:py-16 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-accent border border-border px-3.5 py-1 text-xs font-semibold text-foreground">
            Support & Knowledge Base
          </span>
          <h1 className="text-3xl font-bold text-foreground sm:text-5xl tracking-tight mt-3 font-heading">
            How can we assist you?
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground">Search our documentation, studio guides, and frequently asked questions.</p>

          <div className="relative mt-6">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for answers, guides, or billing help..."
              className="pl-10 h-11 text-xs rounded-2xl"
            />
          </div>
        </motion.div>

        {/* Categories */}
        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-3">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-card p-5 text-left transition-shadow hover:shadow-md"
            >
              <cat.icon className="h-6 w-6 text-foreground" />
              <h3 className="mt-3 text-sm font-semibold text-foreground font-heading">{cat.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{cat.desc}</p>
              <p className="mt-2 text-[10px] font-semibold text-muted-foreground uppercase">{cat.articles} articles</p>
            </motion.div>
          ))}
        </div>

        {/* FAQs */}
        <div className="mx-auto mt-14 max-w-3xl">
          <h2 className="mb-6 text-xl font-bold text-foreground font-heading">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs
              .filter((f) => !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))
              .map((faq, idx) => (
                <details key={idx} className="group rounded-2xl border border-border bg-card p-4 transition-all">
                  <summary className="flex cursor-pointer items-center justify-between text-xs sm:text-sm font-semibold text-foreground">
                    <span>{faq.q}</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90 text-muted-foreground" />
                  </summary>
                  <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/50">
                    {faq.a}
                  </p>
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
