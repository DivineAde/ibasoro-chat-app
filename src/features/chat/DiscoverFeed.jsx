import { useEffect, useState } from "react";
import { Hand, Share2, Sparkles, Users } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useChatState } from "../../context/ChatContext";
import { copyText } from "../../lib/clipboard";
import { formatJoined } from "../../lib/format";
import { discoverPeople } from "./chatApi";

const Heading = ({ icon: Icon, children }) => (
  <h3 className="mb-1 mt-4 flex items-center gap-1.5 px-3 text-footnote font-semibold uppercase tracking-wide text-ink-3 first:mt-1">
    <Icon size={14} aria-hidden /> {children}
  </h3>
);

function Person({ person, subtitle, online, disabled, onOpen, onSayHi }) {
  const first = person.name.split(" ")[0];
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onOpen(person)}
        className="press flex min-h-[60px] min-w-0 flex-1 items-center gap-3 rounded-[14px] px-3 py-2 text-left hover:bg-ink/5 disabled:opacity-50"
      >
        <Avatar name={person.name} src={person.pic} size="sm" online={online} ringClass="ring-raised" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-subhead font-semibold text-ink">{person.name}</span>
          <span className="block truncate text-footnote text-ink-2">{online ? <span className="text-success">Online now</span> : subtitle}</span>
        </span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSayHi(person)}
        aria-label={`Say hi to ${first}`}
        className="press mr-1 flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-3 text-footnote font-semibold text-accent-ink hover:bg-accent/15 disabled:opacity-50"
      >
        <Hand size={14} aria-hidden /> Say hi
      </button>
    </li>
  );
}

/** Invite card: Web Share where the device has it, otherwise copy the link. */
function InviteCard() {
  const toast = useToast();
  const invite = async () => {
    const url = `${window.location.origin}/signup`;
    const text = "Chat with me on ìbáṣọ̀rọ̀";
    if (navigator.share) {
      try {
        await navigator.share({ title: "ìbáṣọ̀rọ̀", text, url });
      } catch {
        /* dismissed the share sheet */
      }
    } else {
      if (await copyText(`${text}: ${url}`)) toast.success("Invite link copied", "Paste it into any chat or message.");
      else toast.error("Couldn’t copy the link");
    }
  };
  return (
    <button
      type="button"
      onClick={invite}
      className="press mt-4 flex w-full items-center gap-3 rounded-[16px] bg-accent-soft p-3 text-left"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
        <Share2 size={18} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-subhead font-semibold text-ink">Invite friends</span>
        <span className="block text-footnote text-ink-2">Not on ìbáṣọ̀rọ̀ yet? Send them a link.</span>
      </span>
    </button>
  );
}

/**
 * What the "new message" dialog shows before you type: people you may know (from your groups),
 * people who just joined, and an invite. Tap a row to open the chat; "Say hi" opens it and waves.
 */
export function DiscoverFeed({ onOpen, onSayHi, disabled }) {
  const { online } = useChatState();
  const [state, setState] = useState({ status: "loading", known: [], newest: [] });

  useEffect(() => {
    const controller = new AbortController();
    discoverPeople(controller.signal)
      .then((data) => setState({ status: "ready", known: data.known || [], newest: data.newest || [] }))
      .catch((error) => error.code !== "ERR_CANCELED" && setState({ status: "error", known: [], newest: [] }));
    return () => controller.abort();
  }, []);

  if (state.status === "loading") {
    return (
      <div className="space-y-2 pt-3" aria-label="Loading suggestions" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const empty = !state.known.length && !state.newest.length;
  const props = (p) => ({ person: p, online: Boolean(online[p._id]), disabled, onOpen, onSayHi });

  return (
    <div>
      {state.status === "error" && <p className="px-3 py-3 text-subhead text-ink-3">Couldn’t load suggestions. You can still search above.</p>}

      {state.known.length > 0 && (
        <section aria-label="People you may know">
          <Heading icon={Users}>People you may know</Heading>
          <ul>{state.known.map((p) => <Person key={p._id} subtitle={p.reason} {...props(p)} />)}</ul>
        </section>
      )}

      {state.newest.length > 0 && (
        <section aria-label="New here">
          <Heading icon={Sparkles}>New here</Heading>
          <ul>{state.newest.map((p) => <Person key={p._id} subtitle={formatJoined(p.joinedAt)} {...props(p)} />)}</ul>
        </section>
      )}

      {empty && state.status === "ready" && (
        <p className="px-3 py-4 text-center text-subhead text-ink-3">No suggestions yet. Search by name or email, or invite a friend.</p>
      )}

      <InviteCard />
    </div>
  );
}
