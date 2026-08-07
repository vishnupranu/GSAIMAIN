import { LucideIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface AgentCardProps {
  icon: LucideIcon;
  title: string;
  tasks: string[];
  badge?: string;
}

const AgentCard = ({ icon: Icon, title, tasks, badge }: AgentCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border bg-card p-5 transition-shadow hover:card-shadow-hover"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-foreground" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {badge && (
            <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
              {badge}
            </span>
          )}
        </div>
        <Button size="sm" className="h-8 rounded-lg bg-foreground px-3 text-xs font-medium text-primary-foreground hover:bg-foreground/90">
          + Task
        </Button>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">Popular tasks:</p>
      <div className="flex flex-col gap-2">
        {tasks.map((task, i) => (
          <button
            key={i}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-accent"
          >
            <span className="flex-1 line-clamp-2">{task}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default AgentCard;
