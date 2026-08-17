import { Plus, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { isToday, isYesterday, isThisWeek } from "date-fns";
import { useConversations, type Conversation } from "@/hooks/useConversations";

interface ChatSidebarProps {
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  userId: string | null; // kept for API compatibility; not used (localStorage is session-agnostic)
}

function groupConversations(convs: Conversation[]) {
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const thisWeek: Conversation[] = [];
  const older: Conversation[] = [];

  convs.forEach((c) => {
    const d = new Date(c.updatedAt);
    if (isToday(d)) today.push(c);
    else if (isYesterday(d)) yesterday.push(c);
    else if (isThisWeek(d)) thisWeek.push(c);
    else older.push(c);
  });

  const groups: { label: string; items: Conversation[] }[] = [];
  if (today.length) groups.push({ label: "Today", items: today });
  if (yesterday.length) groups.push({ label: "Yesterday", items: yesterday });
  if (thisWeek.length) groups.push({ label: "This Week", items: thisWeek });
  if (older.length) groups.push({ label: "Older", items: older });
  return groups;
}

const ChatSidebar = ({ currentId, onSelect, onNew }: ChatSidebarProps) => {
  const { conversations, deleteConversation } = useConversations();

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation(id);
    if (currentId === id) onNew();
  };

  const groups = groupConversations(conversations);

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Chats</h2>
        <Button variant="ghost" size="icon" onClick={onNew} className="h-8 w-8 rounded-lg">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {conversations.length === 0 && (
          <p className="p-4 text-xs text-muted-foreground text-center">
            No conversations yet. Start chatting!
          </p>
        )}
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            {group.items.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={cn(
                  "group flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                  currentId === c.id && "bg-accent"
                )}
              >
                <MessageCircle className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-foreground">{c.title}</span>
                <button
                  onClick={(e) => handleDelete(c.id, e)}
                  className="hidden h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive group-hover:flex"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
};

export default ChatSidebar;
