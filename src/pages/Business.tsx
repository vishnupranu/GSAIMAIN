import { Shield, Users, Zap, Headphones } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Shield, title: "Enterprise Security & Privacy", desc: "SOC 2 Type II compliance, SSO, SAML 2.0, zero data retention for model training, and AES-256 encryption." },
  { icon: Users, title: "Collaborative Team Workspaces", desc: "Shared agent repositories, workspace permissions, synchronized conversation histories, and team analytics." },
  { icon: Zap, title: "High-Throughput Dedicated Compute", desc: "Isolated model clusters, sub-30ms latency, custom MCP tool integrations, and priority queuing." },
  { icon: Headphones, title: "Dedicated Solution Architect", desc: "24/7 technical engineering support, custom agent onboarding, and guaranteed 99.9% uptime SLA." },
];

const Business = () => {
  return (
    <AppLayout>
      <div className="px-4 py-12 sm:px-8 sm:py-16 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-accent border border-border px-3.5 py-1 text-xs font-semibold text-foreground">
            Enterprise Grade AI
          </span>
          <h1 className="text-3xl font-bold text-foreground sm:text-5xl tracking-tight mt-3 font-heading">
            GUIDESOFT for Business
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Scale autonomous AI agents, automated slides, documentation, and intelligence across your entire organization.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/pricing">
              <Button className="h-10 px-6 font-semibold">View Plans & Pricing</Button>
            </Link>
            <Link to="/custom-agent">
              <Button variant="outline" className="h-10 px-6 font-semibold">Build Custom Agent</Button>
            </Link>
          </div>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-2">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <feat.icon className="h-8 w-8 text-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground font-heading">{feat.title}</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <AppFooter />
    </AppLayout>
  );
};

export default Business;
