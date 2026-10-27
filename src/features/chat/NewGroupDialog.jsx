import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Avatar } from "../../components/ui/Avatar";
import { useToast } from "../../components/ui/Toast";
import { errorMessage } from "../../lib/api";
import { useChatActions } from "../../context/ChatContext";
import { createGroup } from "./chatApi";
import { UserSearch } from "./UserSearch";

export function NewGroupDialog({ open, onClose }) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const { upsertChat } = useChatActions();
  const navigate = useNavigate();
  const toast = useToast();

  const toggle = (user) =>
    setMembers((list) => (list.some((m) => m._id === user._id) ? list.filter((m) => m._id !== user._id) : [...list, user]));

  const reset = () => {
    setName("");
    setQuery("");
    setMembers([]);
  };

  const close = () => {
    onClose();
    // Wait for the exit animation before clearing the form.
    setTimeout(reset, 200);
  };

  const canCreate = name.trim().length > 0 && members.length >= 2;

  const submit = async () => {
    if (!canCreate) return;
    setSaving(true);
    try {
      const chat = await createGroup({ name: name.trim(), userIds: members.map((m) => m._id) });
      upsertChat(chat);
      close();
      navigate(`/chat/${chat._id}`);
    } catch (error) {
      toast.error("Couldn’t create the group", errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="New group"
      description="Add at least two people."
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!canCreate}>
            Create group
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Group name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Weekend plans" autoFocus />

        {members.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Selected people">
            {members.map((m) => (
              <li key={m._id}>
                <button
                  type="button"
                  onClick={() => toggle(m)}
                  aria-label={`Remove ${m.name}`}
                  className="press flex h-8 items-center gap-1.5 rounded-full bg-accent-soft py-1 pl-1 pr-2.5 text-footnote font-medium text-accent-ink"
                >
                  <Avatar name={m.name} src={m.pic} size="xs" className="[&>span]:h-6 [&>span]:w-6" />
                  {m.name.split(" ")[0]}
                  <X size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <UserSearch
          query={query}
          onQueryChange={setQuery}
          onSelect={toggle}
          selectedIds={members.map((m) => m._id)}
          placeholder="Add people"
        />
      </div>
    </Dialog>
  );
}
