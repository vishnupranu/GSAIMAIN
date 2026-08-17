import { Plus, Paperclip, Mic, CornerDownLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!query.trim()) return;
    navigate(`/chat?q=${encodeURIComponent(query.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="search-shadow rounded-2xl bg-card p-4 transition-shadow hover:card-shadow-hover">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything, create anything"
          className="w-full resize-none bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          rows={2}
        />
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <Plus className="h-4 w-4" />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <Paperclip className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <Mic className="h-4 w-4" />
            </button>
            <button
              onClick={handleSubmit}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <CornerDownLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span>📧</span>
          <span>📅</span>
          <span>📁</span>
          <span>📊</span>
        </div>
        <span>GUIDESOFT supports personalized tools</span>
        <button className="ml-1 text-muted-foreground hover:text-foreground">×</button>
      </div>
    </div>
  );
};

export default SearchBar;
