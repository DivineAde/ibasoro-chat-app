import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, LogOut, UserMinus, UserPlus } from "lucide-react";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { IconButton } from "../../components/ui/IconButton";
import { Avatar } from "../../components/ui/Avatar";
import { useToast } from "../../components/ui/Toast";
import { errorMessage } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useChatActions } from "../../context/ChatContext";
import { addMember, leaveGroup, removeMember, renameGroup } from "./chatApi";
import { UserSearch } from "./UserSearch";

/** Group details. Admins can rename, add and remove people; everyone can leave. */
export function GroupInfoDialog({ open, onClose, chat }) {
  const { user: me } = useAuth();
  const { upsertChat, removeChat } = useChatActions();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState(chat.chatName);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  // Follow renames made by someone else while this is open.
  useEffect(() => setName(chat.chatName), [chat.chatName]);

  const adminId = chat.groupAdmin?._id;
  const isAdmin = adminId === me._id;

  const run = async (action, failure) => {
    setBusy(true);
    try {
      return await action();
    } catch (error) {
      toast.error(failure, errorMessage(error));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const saveName = async () => {
    const next = name.trim();
    if (!next || next === chat.chatName) return setName(chat.chatName);
    const updated = await run(() => renameGroup(chat._id, next), "Couldn’t rename the group");
    if (updated) upsertChat(updated);
  };

  const add = async (user) => {
    const updated = await run(() => addMember(chat._id, user._id), "Couldn’t add that person");
    if (updated) {
      upsertChat(updated);
      setAdding(false);
      setQuery("");
      toast.success(`${user.name} added`);
    }
  };

  const remove = async (user) => {
    const updated = await run(() => removeMember(chat._id, user._id), "Couldn’t remove that person");
    if (updated) upsertChat(updated);
  };

  const leave = async () => {
    const result = await run(() => leaveGroup(chat._id), "Couldn’t leave the group");
    if (result) {
      onClose();
      removeChat(chat._id);
      navigate("/chat", { replace: true });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Group info">
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Avatar name={chat.chatName} group size="xl" />
          {isAdmin ? (
            <Input
              aria-label="Group name"
              value={name}
              maxLength={60}
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="w-full"
              inputClassName="text-center font-semibold"
            />
          ) : (
            <h3 className="text-title2 text-ink">{chat.chatName}</h3>
          )}
        </div>

        <section aria-labelledby="members-heading">
          <div className="mb-1 flex items-center justify-between px-1">
            <h3 id="members-heading" className="text-footnote font-semibold uppercase tracking-wide text-ink-3">
              {chat.users.length} members
            </h3>
            {isAdmin && (
              <Button size="sm" variant="ghost" icon={UserPlus} onClick={() => setAdding((a) => !a)}>
                {adding ? "Done" : "Add"}
              </Button>
            )}
          </div>

          {adding && (
            <div className="mb-3 rounded-[16px] bg-sunken p-3">
              <UserSearch autoFocus query={query} onQueryChange={setQuery} onSelect={add} excludeIds={chat.users.map((u) => u._id)} />
            </div>
          )}

          <ul className="divide-y divide-line">
            {chat.users.map((u) => (
              <li key={u._id} className="flex min-h-[60px] items-center gap-3 px-1 py-2">
                <Avatar name={u.name} src={u.pic} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-subhead font-semibold text-ink">
                    {u.name}
                    {u._id === me._id && <span className="font-normal text-ink-3"> (you)</span>}
                  </p>
                  <p className="truncate text-footnote text-ink-2">{u.email}</p>
                </div>
                {u._id === adminId ? (
                  <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-caption font-semibold text-accent-ink">
                    <Crown size={12} aria-hidden /> Admin
                  </span>
                ) : (
                  isAdmin && (
                    <IconButton label={`Remove ${u.name}`} icon={UserMinus} size="sm" disabled={busy} onClick={() => remove(u)} />
                  )
                )}
              </li>
            ))}
          </ul>
        </section>

        <Button variant="danger" icon={LogOut} className="w-full" onClick={leave} disabled={busy}>
          Leave group
        </Button>
      </div>
    </Dialog>
  );
}
