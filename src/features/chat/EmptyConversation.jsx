import { LogoMark } from "../../components/ui/Logo";

/** Right-hand pane on desktop when no chat is open. */
export function EmptyConversation() {
  return (
    <div className="chat-pattern flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <LogoMark size={56} />
      <div>
        <h2 className="text-title2 text-ink">Pick a conversation</h2>
        <p className="mt-1 max-w-[30ch] text-subhead text-ink-2">
          Choose a chat from the list, or start a new one with the pencil button.
        </p>
      </div>
    </div>
  );
}
