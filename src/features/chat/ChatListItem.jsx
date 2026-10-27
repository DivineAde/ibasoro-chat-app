import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";
import { Avatar } from "../../components/ui/Avatar";
import { CountBadge } from "../../components/ui/Badge";
import { chatPicture, chatPreview, chatTitle, getOtherUser } from "../../lib/chat";
import { formatListTime } from "../../lib/format";
import { useAuth } from "../../context/AuthContext";
import { useChatState } from "../../context/ChatContext";

export function ChatListItem({ chat, active, index }) {
  const { user: me } = useAuth();
  const { online, typing } = useChatState();

  const title = chatTitle(chat, me);
  const other = !chat.isGroupChat ? getOtherUser(chat, me) : null;
  const isOnline = other && online[other._id];
  const typers = Object.entries(typing[chat._id] || {}).filter(([id]) => id !== me._id);
  const preview = chatPreview(chat, me);
  const unread = chat.unreadCount > 0;

  return (
    <li
      className="animate-list-in"
      // A light stagger on first paint only; capped so long lists don't feel slow.
      style={{ animationDelay: `${Math.min(index, 8) * 24}ms` }}
    >
      <Link
        to={`/chat/${chat._id}`}
        aria-current={active ? "page" : undefined}
        className={cn(
          "press mx-2 flex min-h-[72px] items-center gap-3 rounded-[16px] px-3 py-2.5",
          active ? "bg-accent-soft" : "hover:bg-ink/5"
        )}
      >
        <Avatar
          name={title}
          src={chatPicture(chat, me)}
          group={chat.isGroupChat}
          online={isOnline}
          ringClass={active ? "ring-accent-soft" : "ring-surface"}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cn("truncate text-subhead text-ink", unread ? "font-bold" : "font-semibold")}>{title}</span>
            <time
              dateTime={chat.latestMessage?.createdAt}
              className={cn("shrink-0 text-caption tabular-nums", unread ? "font-semibold text-accent-ink" : "text-ink-3")}
            >
              {formatListTime(chat.latestMessage?.createdAt)}
            </time>
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            {typers.length ? (
              <span className="truncate text-footnote font-medium text-accent-ink">
                {chat.isGroupChat ? `${typers[0][1].split(" ")[0]} is typing…` : "typing…"}
              </span>
            ) : preview ? (
              <span className={cn("truncate text-footnote", unread ? "font-medium text-ink" : "text-ink-2")}>{preview}</span>
            ) : (
              <span className="truncate text-footnote italic text-ink-3">No messages yet</span>
            )}
            <CountBadge count={chat.unreadCount} />
          </span>
        </span>
      </Link>
    </li>
  );
}
