import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface ToolCardProps {
  icon: LucideIcon;
  label: string;
  badge?: string;
  onClick?: () => void;
}

const ToolCard = ({ icon: Icon, label, badge, onClick }: ToolCardProps) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      className="group flex flex-col items-center gap-2 rounded-xl p-3 sm:p-4 transition-colors hover:bg-accent"
    >
      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl border border-border bg-card transition-shadow group-hover:card-shadow">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] sm:text-xs font-medium text-foreground">{label}</span>
        {badge && (
          <span className="rounded-full bg-tool-blue px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
            {badge}
          </span>
        )}
      </div>
    </motion.button>
  );
};

export default ToolCard;
