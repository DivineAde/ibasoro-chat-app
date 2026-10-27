import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircleOff } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { useActiveChat, useChatActions, useChatState } from "../../context/ChatContext";
import { getOtherUser } from "../../lib/chat";
import { ChatHeader } from "./ChatHeader";
import { Composer } from "./Composer";
import { GroupInfoDialog } from "./GroupInfoDialog";
import { MessageList } from "./MessageList";
import { ProfileDialog } from "./ProfileDialog";

function TranscriptSkeleton() {
  const rows = [
    ["start", "w-48"],
    ["start", "w-64"],
    ["end", "w-40"],
    ["end", "w-56"],
    ["start", "w-52"],
    ["end", "w-44"],
  ];
  return (
    <div className="flex-1 space-y-3 overflow-hidden px-4 pt-6" aria-hidden>
      {rows.map(([side, width], i) => (
        <div key={i} className={side === "end" ? "flex justify-end" : "flex justify-start"}>
          <Skeleton className={`h-10 ${width} rounded-bubble`} />
        </div>
      ))}
    </div>
  );
}

/** One open conversation: header, transcript, composer, details dialogs. */
export function ChatView() {
  const { user: me } = useAuth();
  const chat = useActiveChat();
  const { activeChatId, chatsStatus, messages, typing } = useChatState();
  const { loadChats, loadMessages, markRead } = useChatActions();
  const [infoOpen, setInfoOpen] = useState(false);

  const entry = messages[activeChatId];
  const unread = chat?.unreadCount || 0;
  const unreadRef = useRef(unread);
  unreadRef.current = unread;

  // Fetch history when the chat opens, or after a reconnect cleared the cache.
  const hasChat = Boolean(chat);
  const hasEntry = Boolean(entry);
  useEffect(() => {
    if (hasChat && !hasEntry) loadMessages(activeChatId);
  }, [activeChatId, hasChat, hasEntry, loadMessages]);

  // Opening the chat reads it; so does coming back to a tab with unread messages.
  useEffect(() => {
    if (unread > 0 && !document.hidden) markRead(activeChatId);
  }, [activeChatId, unread, markRead]);
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && unreadRef.current > 0) markRead(activeChatId);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [activeChatId, markRead]);

  // Close details when switching conversation.
  useEffect(() => setInfoOpen(false), [activeChatId]);

  const shell = "flex h-full min-h-0 flex-col bg-canvas animate-pane-in md:animate-none";

  if (!chat) {
    if (chatsStatus === "idle" || chatsStatus === "loading") {
      return (
        <section className={shell} aria-busy="true">
          <TranscriptSkeleton />
        </section>
      );
    }
    return (
      <section className={shell}>
        <EmptyState
          className="h-full"
          icon={MessageCircleOff}
          title="Conversation not found"
          description={chatsStatus === "error" ? "We couldn’t load your chats." : "It may have been removed, or you’re no longer a member."}
          action={
            chatsStatus === "error" ? (
              <Button variant="secondary" onClick={loadChats}>Try again</Button>
            ) : (
              <Link to="/chat" className="press inline-flex h-11 items-center rounded-control bg-sunken px-5 text-subhead font-semibold text-ink">
                Back to messages
              </Link>
            )
          }
        />
      </section>
    );
  }

  const typingNames = Object.entries(typing[chat._id] || {})
    .filter(([id]) => id !== me._id)
    .map(([, name]) => name.split(" ")[0]);

  return (
    <section className={shell} aria-label="Conversation">
      <ChatHeader chat={chat} onOpenInfo={() => setInfoOpen(true)} />

      <div className="chat-pattern flex min-h-0 flex-1 flex-col">
        {!entry || entry.status === "loading" ? (
          <TranscriptSkeleton />
        ) : entry.status === "error" ? (
          <EmptyState
            className="flex-1"
            title="Couldn’t load messages"
            description="Check your connection and try again."
            action={<Button variant="secondary" onClick={() => loadMessages(chat._id)}>Try again</Button>}
          />
        ) : (
          <MessageList
            chat={chat}
            items={entry.items}
            hasMore={entry.hasMore}
            loadingMore={entry.loadingMore}
            typingNames={typingNames}
          />
        )}
      </div>

      <Composer key={chat._id} chatId={chat._id} />

      {chat.isGroupChat ? (
        <GroupInfoDialog open={infoOpen} onClose={() => setInfoOpen(false)} chat={chat} />
      ) : (
        <ProfileDialog open={infoOpen} onClose={() => setInfoOpen(false)} user={getOtherUser(chat, me)} />
      )}
    </section>
  );
}
