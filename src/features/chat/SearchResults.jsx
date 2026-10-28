import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { useDebounce } from "../../hooks/useDebounce";
import { chatPicture, chatTitle, messagePreview } from "../../lib/chat";
import { formatListTime } from "../../lib/format";
import { snippet } from "../../lib/search";
import { ChatListItem } from "./ChatListItem";
import { searchMessages } from "./chatApi";

const Heading = ({ children }) => (
  <h2 className="px-5 pb-1 pt-3 text-footnote font-semibold uppercase tracking-wide text-ink-3">{children}</h2>
);

/** Search results: matching chats first, then individual messages from the server. */
export function SearchResults({ query, chats, activeChatId, onFindPeople }) {
  const { user: me } = useAuth();
  const term = useDebounce(query, 280);
  const [state, setState] = useState({ term: "", results: [], status: "idle" });

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, term, status: "loading" }));
    searchMessages(term, controller.signal)
      .then((results) => setState({ term, results, status: "done" }))
      .catch((error) => !controller.signal.aborted && error.code !== "ERR_CANCELED" && setState({ term, results: [], status: "error" }));
    return () => controller.abort();
  }, [term]);

  const waiting = state.status === "loading" || term !== query;
  const none = !chats.length && !state.results.length && !waiting;

  if (none) {
    return (
      <EmptyState
        className="h-full pb-16"
        icon={SearchX}
        title={`No results for “${query}”`}
        description={state.status === "error" ? "Message search isn’t available right now." : "Looking for someone new?"}
        action={<Button variant="secondary" onClick={onFindPeople}>Search people</Button>}
      />
    );
  }

  return (
    <div className="pb-4">
      {chats.length > 0 && (
        <>
          <Heading>Chats</Heading>
          <ul aria-label="Matching chats">
            {chats.map((chat, i) => <ChatListItem key={chat._id} chat={chat} index={i} active={chat._id === activeChatId} />)}
          </ul>
        </>
      )}

      {(state.results.length > 0 || waiting) && <Heading>Messages</Heading>}
      {waiting && !state.results.length && (
        <div className="space-y-3 px-5 pt-1" aria-hidden>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-4/5" />
        </div>
      )}
      <ul aria-label="Matching messages" className={waiting ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {state.results.map((m) => {
          const chat = m.chat;
          const s = snippet(m.content || m.attachment?.name || messagePreview(m), state.term);
          const mine = m.sender?._id === me._id;
          return (
            <li key={m._id}>
              <Link
                to={`/chat/${chat._id}?m=${m._id}`}
                className="press mx-2 flex min-h-[64px] items-center gap-3 rounded-[16px] px-3 py-2 hover:bg-ink/5"
              >
                <Avatar name={chatTitle(chat, me)} src={chatPicture(chat, me)} group={chat.isGroupChat} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-subhead font-semibold text-ink">{chatTitle(chat, me)}</span>
                    <time dateTime={m.createdAt} className="shrink-0 text-caption tabular-nums text-ink-3">{formatListTime(m.createdAt)}</time>
                  </span>
                  <span className="block truncate text-footnote text-ink-2">
                    <span className="text-ink-3">{mine ? "You" : m.sender?.name?.split(" ")[0]}: </span>
                    {s.before}
                    {s.match && <mark className="rounded-[3px] bg-accent-soft px-0.5 font-semibold text-accent-ink">{s.match}</mark>}
                    {s.after}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
