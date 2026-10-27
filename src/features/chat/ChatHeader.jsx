import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../../components/ui/Avatar";
import { IconButton } from "../../components/ui/IconButton";
import { useAuth } from "../../context/AuthContext";
import { useChatState } from "../../context/ChatContext";
import { chatPicture, chatTitle, getOtherUser } from "../../lib/chat";
import { formatLastSeen } from "../../lib/format";

/** Back button (phones), identity, live status. Tapping the identity opens details. */
export function ChatHeader({ chat, onOpenInfo }) {
  const { user: me } = useAuth();
  const { online, lastSeen, typing } = useChatState();
  const navigate = useNavigate();

  const title = chatTitle(chat, me);
  const other = chat.isGroupChat ? null : getOtherUser(chat, me);
  const typers = Object.entries(typing[chat._id] || {}).filter(([id]) => id !== me._id);

  let status;
  let live = false;
  if (typers.length) {
    status = chat.isGroupChat ? `${typers.map(([, n]) => n.split(" ")[0]).join(", ")} typing…` : "typing…";
    live = true;
  } else if (chat.isGroupChat) {
    status = `${chat.users.length} members`;
  } else if (online[other?._id]) {
    status = "Online";
    live = true;
  } else {
    status = formatLastSeen(lastSeen[other?._id] || other?.lastSeenAt);
  }

  return (
    <header className="glass relative z-10 flex items-center gap-1 border-b border-line px-2 pb-2 pt-[calc(var(--safe-top)+8px)] md:px-4">
      <IconButton
        label="Back to conversations"
        icon={ChevronLeft}
        iconSize={26}
        className="md:hidden"
        onClick={() => navigate("/chat")}
      />
      <button
        type="button"
        onClick={onOpenInfo}
        aria-label={`${chat.isGroupChat ? "Group" : "Contact"} info: ${title}`}
        className="press flex min-w-0 flex-1 items-center gap-3 rounded-[14px] px-2 py-1.5 text-left hover:bg-ink/5"
      >
        <Avatar
          name={title}
          src={chatPicture(chat, me)}
          group={chat.isGroupChat}
          size="sm"
          online={!chat.isGroupChat && online[other?._id]}
        />
        <span className="min-w-0">
          <span className="block truncate text-headline text-ink">{title}</span>
          <span
            className={`block truncate text-footnote ${live ? "text-accent-ink" : "text-ink-2"}`}
            aria-live="polite"
          >
            {status}
          </span>
        </span>
      </button>
    </header>
  );
}
