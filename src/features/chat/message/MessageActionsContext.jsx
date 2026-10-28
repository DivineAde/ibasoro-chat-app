import { createContext, useContext } from "react";

/**
 * What a bubble can do. ChatView provides stable callbacks, so memoised bubbles
 * don't re-render when the composer's state changes.
 *   onReply(message) · onEdit(message) · onDelete(message) · onReact(message, emoji|null)
 *   onJump(messageId) · onOpenImage(message)
 */
export const MessageActionsContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useMessageActions = () => useContext(MessageActionsContext) || {};
