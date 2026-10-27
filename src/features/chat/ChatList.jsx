import { MessageCirclePlus, SearchX } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { ChatListItem } from "./ChatListItem";

function ChatListSkeleton() {
  return (
    <div className="space-y-1 px-2 pt-1" aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex min-h-[72px] items-center gap-3 px-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatList({ chats, status, activeChatId, search, onNewChat, onFindPeople, onRetry }) {
  if (status === "idle" || status === "loading") return <ChatListSkeleton />;

  if (status === "error") {
    return (
      <EmptyState
        className="h-full pb-16"
        title="Couldn’t load your chats"
        description="Check your connection and try again."
        action={<Button variant="secondary" onClick={onRetry}>Try again</Button>}
      />
    );
  }

  if (chats.length === 0) {
    return search ? (
      <EmptyState
        className="h-full pb-16"
        icon={SearchX}
        title={`No chats match “${search}”`}
        description="Looking for someone new?"
        action={<Button variant="secondary" onClick={onFindPeople}>Search people</Button>}
      />
    ) : (
      <EmptyState
        className="h-full pb-16"
        icon={MessageCirclePlus}
        title="No conversations yet"
        description="Say hello to someone. Your chats will show up here."
        action={<Button onClick={onNewChat}>Start a conversation</Button>}
      />
    );
  }

  return (
    <ul aria-label="Conversations" className="pb-4">
      {chats.map((chat, i) => (
        <ChatListItem key={chat._id} chat={chat} index={i} active={chat._id === activeChatId} />
      ))}
    </ul>
  );
}
