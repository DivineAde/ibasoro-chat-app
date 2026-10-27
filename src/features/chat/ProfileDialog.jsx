import { Mail } from "lucide-react";
import { Dialog } from "../../components/ui/Dialog";
import { Avatar } from "../../components/ui/Avatar";
import { useChatState } from "../../context/ChatContext";
import { formatLastSeen } from "../../lib/format";

/** Read-only profile of the other person in a one-to-one chat. */
export function ProfileDialog({ open, onClose, user }) {
  const { online, lastSeen } = useChatState();
  if (!user) return null;
  const isOnline = online[user._id];
  const seen = lastSeen[user._id] || user.lastSeenAt;

  return (
    <Dialog open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center gap-4 pb-2 text-center">
        <Avatar name={user.name} src={user.pic} size="xl" online={isOnline} ringClass="ring-raised" />
        <div>
          <h2 className="text-title2 text-ink">{user.name}</h2>
          <p className="mt-0.5 text-subhead text-ink-2">{isOnline ? "Online" : formatLastSeen(seen)}</p>
        </div>
        <a
          href={`mailto:${user.email}`}
          className="press flex h-11 items-center gap-2 rounded-control bg-sunken px-4 text-subhead text-ink hover:bg-ink/10"
        >
          <Mail size={18} className="text-ink-2" aria-hidden />
          {user.email}
        </a>
      </div>
    </Dialog>
  );
}
