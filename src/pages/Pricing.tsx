import { useState } from "react";
import { Check, ShieldCheck, Sparkles, Zap, Smartphone, QrCode, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import PaymentModal from "@/components/PaymentModal";

const plans = [
  {
    name: "Free Starter",
    price: "$0",
    period: "forever",
    description: "Essential AI tools for individuals and quick experiments.",
    features: [
      "Access to all 12 AI Studios (Slides, Sheets, Docs, etc.)",
      "Local Ollama models (Llama 3.2, Mistral) with zero latency",
      "5 cloud AI sessions per day",
      "Export to HTML, Markdown, and CSV",
      "Community support",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Pro Unlimited",
    price: "$19",
    period: "/month",
    description: "Unlimited high-speed intelligence for creators, developers & pros.",
    features: [
      "Unlimited AI Chat & Coding with all model providers",
      "Unlimited AI Slides, Sheets, Docs, and Designer generation",
      "Unlimited AI Music chords & Video storyboard synthesis",
      "Custom Agent Builder & live test playground",
      "Priority response queue & multi-model fallback chain",
      "Full API access & webhook integrations",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    name: "Enterprise Team",
    price: "$49",
    period: "/month",
    description: "Scalable autonomous agents for businesses and collaborative teams.",
    features: [
      "Everything in Pro Unlimited",
      "Multi-seat team workspace & shared conversation repos",
      "Custom MCP Tool integrations & internal database connectors",
      "Dedicated high-throughput model endpoints",
      "Admin telemetry dashboard & audit logs",
      "SSO, SAML & 99.9% uptime SLA",
      "Dedicated account architect & onboarding",
    ],
    cta: "Upgrade to Enterprise",
    popular: false,
  },
];

const Pricing = () => {
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: string; period: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectPlan = (plan: (typeof plans)[0]) => {
    setSelectedPlan({
      name: plan.name,
      price: plan.price,
      period: plan.period,
    });
    setIsModalOpen(true);
  };

  return (
    <AppLayout>
      <div className="px-4 py-12 sm:px-8 sm:py-16 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <span className="rounded-full bg-accent border border-border px-3.5 py-1 text-xs font-semibold text-foreground">
            Simple & Transparent Plans
          </span>
          <h1 className="text-3xl font-extrabold text-foreground sm:text-5xl tracking-tight font-heading">
            Power your workflow with GUIDESOFT
          </h1>
          <p className="mx-auto max-w-xl text-sm sm:text-base text-muted-foreground">
            Instant activation with Google Pay, UPI, and Credit/Debit cards. Upgrade, downgrade, or cancel anytime.
          </p>

          {/* Payment Badges */}
          <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <span className="font-bold">GPay</span> Google Pay
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <QrCode className="h-4 w-4" /> Instant UPI
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <CreditCard className="h-4 w-4" /> Visa / Mastercard / RuPay
            </span>
          </div>
        </motion.div>

        {/* Pricing Cards Grid */}
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-3xl border p-7 flex flex-col justify-between transition-all ${
                plan.popular
                  ? "border-foreground bg-card shadow-xl scale-[1.02] ring-1 ring-foreground/20"
                  : "border-border bg-card/70 hover:bg-card"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-4 py-1 text-xs font-bold text-primary-foreground shadow-sm">
                  ★ MOST POPULAR
                </span>
              )}

              <div>
                <h3 className="text-xl font-bold text-foreground font-heading">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">{plan.description}</p>

                <div className="mt-4 pb-4 border-b border-border">
                  <span className="text-4xl font-extrabold text-foreground font-heading">{plan.price}</span>
                  <span className="text-xs text-muted-foreground font-medium ml-1">{plan.period}</span>
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90 leading-relaxed">
                      <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={() => handleSelectPlan(plan)}
                className={`mt-8 w-full h-11 rounded-2xl text-xs font-semibold ${
                  plan.popular
                    ? "bg-foreground text-primary-foreground hover:opacity-90 shadow-md"
                    : "variant-outline border-border"
                }`}
                variant={plan.popular ? "default" : "outline"}
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Security & FAQ Banner */}
        <div className="mt-16 rounded-2xl border border-border bg-muted/20 p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">30-Day Money-Back Guarantee</h4>
              <p className="text-xs text-muted-foreground">Try GUIDESOFT risk-free. Cancel with 1 click from your Dashboard anytime.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => handleSelectPlan(plans[1])} className="text-xs rounded-xl">
            Upgrade with GPay / UPI
          </Button>
        </div>
      </div>

      {selectedPlan && (
        <PaymentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          planName={selectedPlan.name}
          price={selectedPlan.price}
          period={selectedPlan.period}
        />
      )}

      <AppFooter />
    </AppLayout>
  );
};

export default Pricing;
