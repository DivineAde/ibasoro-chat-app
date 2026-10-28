import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MessageCircleOff, Paperclip } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { useActiveChat, useChatActions, useChatState } from "../../context/ChatContext";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";
import { canEditMessage, getOtherUser, isDeleted } from "../../lib/chat";
import { copyText } from "../../lib/clipboard";
import { ChatHeader } from "./ChatHeader";
import { Composer } from "./Composer";
import { GroupInfoDialog } from "./GroupInfoDialog";
import { MessageList } from "./MessageList";
import { ProfileDialog } from "./ProfileDialog";
import { Lightbox } from "./message/Lightbox";
import { MessageActionsContext } from "./message/MessageActionsContext";

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
  const { loadChats, loadMessages, loadAround, markRead, deleteMessage, reactToMessage } = useChatActions();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [infoOpen, setInfoOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [viewerId, setViewerId] = useState(null);
  const [focus, setFocus] = useState(null); // { id } – scroll to this message
  const [highlightId, setHighlightId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const composer = useRef(null);

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

  // Close details and drop in-progress reply/edit when switching conversation.
  useEffect(() => {
    setInfoOpen(false);
    setReplyTo(null);
    setEditing(null);
    setDeleting(null);
    setViewerId(null);
    setFocus(null);
  }, [activeChatId]);

  // Scroll to a message, loading the surrounding history first if it isn't on screen.
  const entryRef = useRef(entry);
  entryRef.current = entry;
  const jumpTo = useCallback(
    async (id) => {
      if (!entryRef.current?.items.some((m) => m._id === id) && !(await loadAround(activeChatId, id))) return;
      setFocus({ id });
      setHighlightId(id);
      setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1800);
    },
    [activeChatId, loadAround]
  );

  // Arriving from a search result: /chat/:id?m=<messageId>
  const wantedId = searchParams.get("m");
  useEffect(() => {
    if (!wantedId || !hasChat) return;
    setSearchParams({}, { replace: true });
    jumpTo(wantedId);
  }, [wantedId, hasChat, jumpTo, setSearchParams]);

  const meId = me._id;
  const actions = useMemo(
    () => ({
      meId,
      onReply: (m) => {
        setEditing(null);
        setReplyTo(m);
      },
      onEdit: (m) => {
        setReplyTo(null);
        setEditing(m);
      },
      onDelete: setDeleting,
      onReact: (m, emoji) => reactToMessage(activeChatId, m._id, emoji),
      onCopy: async (m) => ((await copyText(m.content)) ? toast.success("Copied") : toast.error("Couldn’t copy")),
      onOpenImage: (m) => setViewerId(m._id),
      onJump: jumpTo,
    }),
    [meId, activeChatId, reactToMessage, toast, jumpTo]
  );

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

  const photos = entry?.items.filter((m) => m.type === "image" && !isDeleted(m) && m.attachment) || [];
  const editLast = () => {
    const last = [...(entry?.items || [])].reverse().find((m) => m.sender?._id === me._id && !isDeleted(m));
    if (last && canEditMessage(last, me._id)) actions.onEdit(last);
  };

  const hasFiles = (e) => e.dataTransfer?.types?.includes("Files");
  const dragHandlers = {
    onDragEnter: (e) => hasFiles(e) && (e.preventDefault(), setDragging(true)),
    onDragOver: (e) => hasFiles(e) && e.preventDefault(),
    onDragLeave: (e) => !e.currentTarget.contains(e.relatedTarget) && setDragging(false),
    onDrop: (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDragging(false);
      composer.current?.addFiles(e.dataTransfer.files);
    },
  };

  const typingNames = Object.entries(typing[chat._id] || {})
    .filter(([id]) => id !== me._id)
    .map(([, name]) => name.split(" ")[0]);

  return (
    <MessageActionsContext.Provider value={actions}>
    <section className={cn(shell, "relative")} aria-label="Conversation" {...dragHandlers}>
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
            hasNewer={entry.hasNewer}
            onLatest={() => loadMessages(chat._id)}
            typingNames={typingNames}
            focus={focus}
            onFocused={() => setFocus(null)}
            highlightId={highlightId}
          />
        )}
      </div>

      <Composer
        key={chat._id}
        ref={composer}
        chatId={chat._id}
        meId={me._id}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editing={editing}
        onDoneEditing={() => setEditing(null)}
        onEditLast={editLast}
      />

      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-20 flex animate-fade-in flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-accent-ink bg-surface/85 text-accent-ink backdrop-blur-sm">
          <Paperclip size={28} aria-hidden />
          <p className="text-headline">Drop to send</p>
        </div>
      )}

      {viewerId && <Lightbox images={photos} startId={viewerId} onClose={() => setViewerId(null)} />}

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        size="sm"
        title="Delete this message?"
        description="It will be removed for everyone in this chat."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                deleteMessage(chat._id, deleting._id);
                setDeleting(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="truncate rounded-control bg-sunken px-3 py-2 text-subhead text-ink-2">
          {deleting?.type === "text" || !deleting?.type ? deleting?.content : deleting && "Attachment"}
        </p>
      </Dialog>

      {chat.isGroupChat ? (
        <GroupInfoDialog open={infoOpen} onClose={() => setInfoOpen(false)} chat={chat} />
      ) : (
        <ProfileDialog open={infoOpen} onClose={() => setInfoOpen(false)} user={getOtherUser(chat, me)} />
      )}
    </section>
    </MessageActionsContext.Provider>
  );
}
