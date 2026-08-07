import { Shield, Users, Zap, Headphones } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Shield, title: "Enterprise Security", desc: "SOC 2 compliance, SSO, SAML, and data encryption at rest and in transit." },
  { icon: Users, title: "Team Collaboration", desc: "Shared workspaces, role-based access, and real-time collaboration on all AI tools." },
  { icon: Zap, title: "Priority Performance", desc: "Dedicated compute resources for faster AI responses and priority queue access." },
  { icon: Headphones, title: "Dedicated Support", desc: "24/7 dedicated account manager and priority technical support." },
];

const Business = () => {
  return (
    <AppLayout>
      <div className="px-4 py-12 sm:px-8 sm:py-16">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Genspark for Business</h1>
          <p className="mt-3 text-muted-foreground">Empower your team with AI-powered productivity tools designed for enterprise.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/pricing">
              <Button>View pricing</Button>
            </Link>
            <Button variant="outline">Contact sales</Button>
          </div>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-2">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <feat.icon className="h-8 w-8 text-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">{feat.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <AppFooter />
    </AppLayout>
  );
};

export default Business;
