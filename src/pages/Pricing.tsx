import { Check } from "lucide-react";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["5 AI chats per day", "Basic agents", "Community support", "1 project"],
    cta: "Get started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    features: ["Unlimited AI chat", "Unlimited AI image", "All agents", "Priority support", "10 projects", "API access"],
    cta: "Start free trial",
    popular: true,
  },
  {
    name: "Business",
    price: "$49",
    period: "/month",
    features: ["Everything in Pro", "Team collaboration", "Admin dashboard", "SSO & SAML", "Unlimited projects", "Custom agents", "Dedicated support"],
    cta: "Contact sales",
    popular: false,
  },
];

const Pricing = () => {
  return (
    <AppLayout>
      <div className="px-4 py-12 sm:px-8 sm:py-16">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Simple, transparent pricing</h1>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">Choose the plan that fits your needs. Upgrade or downgrade anytime.</p>
        </motion.div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl border p-6 ${plan.popular ? "border-foreground bg-card shadow-lg" : "border-border bg-card"}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-primary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-tool-green" /> {f}
                  </li>
                ))}
              </ul>
              <Button className={`mt-6 w-full ${plan.popular ? "" : "variant-outline"}`} variant={plan.popular ? "default" : "outline"}>
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
      <AppFooter />
    </AppLayout>
  );
};

export default Pricing;
