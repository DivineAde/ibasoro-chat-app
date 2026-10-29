import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";
import { errorMessage } from "../../lib/api";
import { useChatActions } from "../../context/ChatContext";
import { openDirectChat } from "./chatApi";
import { DiscoverFeed } from "./DiscoverFeed";
import { UserSearch } from "./UserSearch";

export function NewChatDialog({ open, onClose, initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [opening, setOpening] = useState(false);
  const { upsertChat, sendMessage } = useChatActions();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (open) setQuery(initialQuery);
  }, [open, initialQuery]);

  // `wave` also sends a friendly first message, so an empty chat never sits there awkwardly.
  const start = async (user, wave = false) => {
    if (opening) return;
    setOpening(true);
    try {
      const chat = await openDirectChat(user._id);
      upsertChat(chat);
      onClose();
      navigate(`/chat/${chat._id}`);
      if (wave) sendMessage(chat._id, `👋 Hi ${user.name.split(" ")[0]}!`);
    } catch (error) {
      toast.error("Couldn’t start the chat", errorMessage(error));
    } finally {
      setOpening(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="New message" description="Search, or discover people to talk to.">
      <UserSearch
        autoFocus
        query={query}
        onQueryChange={setQuery}
        onSelect={(u) => start(u)}
        idleContent={<DiscoverFeed disabled={opening} onOpen={(u) => start(u)} onSayHi={(u) => start(u, true)} />}
      />
    </Dialog>
  );
}
