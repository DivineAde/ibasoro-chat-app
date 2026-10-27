import { Outlet } from "react-router-dom";
import { cn } from "../lib/cn";
import { ChatProvider, useChatState } from "../context/ChatContext";
import { Sidebar } from "../features/chat/Sidebar";

/**
 * Two panes from `md` up. On phones it behaves like a navigation stack:
 * /chat shows the list, /chat/:id shows the conversation full-screen.
 */
function Shell() {
  const { activeChatId } = useChatState();
  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <Sidebar
        className={cn(
          "w-full shrink-0 md:w-[22rem] md:border-r md:border-line lg:w-[25rem]",
          activeChatId ? "hidden md:flex" : "flex"
        )}
      />
      <main className={cn("min-w-0 flex-1 flex-col", activeChatId ? "flex" : "hidden md:flex")}>
        <Outlet />
      </main>
    </div>
  );
}

export function ChatLayout() {
  return (
    <ChatProvider>
      <Shell />
    </ChatProvider>
  );
}
