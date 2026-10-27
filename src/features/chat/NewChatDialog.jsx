import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";
import { errorMessage } from "../../lib/api";
import { useChatActions } from "../../context/ChatContext";
import { openDirectChat } from "./chatApi";
import { UserSearch } from "./UserSearch";

export function NewChatDialog({ open, onClose, initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [opening, setOpening] = useState(false);
  const { upsertChat } = useChatActions();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (open) setQuery(initialQuery);
  }, [open, initialQuery]);

  const start = async (user) => {
    if (opening) return;
    setOpening(true);
    try {
      const chat = await openDirectChat(user._id);
      upsertChat(chat);
      onClose();
      navigate(`/chat/${chat._id}`);
    } catch (error) {
      toast.error("Couldn’t start the chat", errorMessage(error));
    } finally {
      setOpening(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="New message" description="Find someone to talk to.">
      <UserSearch autoFocus query={query} onQueryChange={setQuery} onSelect={start} />
    </Dialog>
  );
}
