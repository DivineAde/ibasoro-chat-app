import { useMemo, useState } from "react";
import { Search, SquarePen, Users, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { useAuth } from "../../context/AuthContext";
import { useChatActions, useChatState } from "../../context/ChatContext";
import { chatTitle } from "../../lib/chat";
import { Avatar } from "../../components/ui/Avatar";
import { IconButton } from "../../components/ui/IconButton";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { LogoMark } from "../../components/ui/Logo";
import { ChatList } from "./ChatList";
import { NewChatDialog } from "./NewChatDialog";
import { NewGroupDialog } from "./NewGroupDialog";
import { SettingsDialog } from "./SettingsDialog";

export function Sidebar({ className }) {
  const { user } = useAuth();
  const { chats, chatsStatus, activeChatId } = useChatState();
  const { loadChats } = useChatActions();
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(null); // "chat" | "group" | "settings"
  const [scrolled, setScrolled] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => chatTitle(c, user).toLowerCase().includes(q));
  }, [chats, search, user]);

  return (
    <aside className={cn("flex min-h-0 flex-col bg-surface", className)} aria-label="Conversations">
      <header
        className={cn(
          "glass relative z-10 px-4 pb-3 pt-[calc(var(--safe-top)+12px)] transition-shadow duration-200",
          scrolled && "shadow-[0_1px_0_var(--line)]"
        )}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDialog("settings")}
            aria-label="Open settings"
            className="press -ml-1 flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-ink/5"
          >
            <Avatar name={user.name} src={user.pic} size="sm" />
          </button>
          <LogoMark size={22} className="ml-1 md:hidden" />
          <div className="flex-1" />
          <ThemeToggle />
          <IconButton label="New group" icon={Users} onClick={() => setDialog("group")} />
          <IconButton label="New message" icon={SquarePen} onClick={() => setDialog("chat")} />
        </div>

        <h1 className="mt-2 text-title1 text-ink">Messages</h1>

        <div
          className="mt-3 flex h-10 items-center gap-2 rounded-control bg-sunken px-3 ring-1 ring-inset ring-line focus-within:ring-2 focus-within:ring-accent-ink"
        >
          <Search size={17} className="shrink-0 text-ink-3" aria-hidden />
          <input
            type="search"
            aria-label="Search conversations"
            placeholder="Search"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 appearance-none bg-transparent text-body text-ink outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="press -mr-1 flex h-7 w-7 items-center justify-center rounded-full text-ink-3 hover:text-ink">
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-1" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}>
        <ChatList
          chats={filtered}
          status={chatsStatus}
          activeChatId={activeChatId}
          search={search.trim()}
          onNewChat={() => setDialog("chat")}
          onFindPeople={() => setDialog("chat")}
          onRetry={loadChats}
        />
      </div>

      <NewChatDialog open={dialog === "chat"} onClose={() => setDialog(null)} initialQuery={search.trim()} />
      <NewGroupDialog open={dialog === "group"} onClose={() => setDialog(null)} />
      <SettingsDialog open={dialog === "settings"} onClose={() => setDialog(null)} />
    </aside>
  );
}
