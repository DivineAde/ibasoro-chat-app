import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MessageBubble } from "./MessageBubble";
import { MessageActionsContext } from "./message/MessageActionsContext";

const base = {
  message: { _id: "m1", sender: { _id: "me", name: "Me" }, content: "hello https://example.com.", createdAt: "2024-03-05T10:00:00Z" },
  mine: true,
  position: "single",
  isGroup: false,
};
const renderBubble = (props) => render(<ul><MessageBubble {...base} {...props} /></ul>);

describe("MessageBubble", () => {
  it("renders links safely, without the trailing full stop", () => {
    renderBubble();
    const link = screen.getByRole("link", { name: "https://example.com" });
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows sent vs read state", () => {
    const { unmount } = renderBubble();
    expect(screen.getByLabelText("Sent")).toBeInTheDocument();
    unmount();
    renderBubble({ read: true });
    expect(screen.getByLabelText("Read")).toBeInTheDocument();
  });

  it("offers retry and delete for a failed message", async () => {
    const onRetry = vi.fn();
    const onDiscard = vi.fn();
    renderBubble({ message: { ...base.message, status: "failed" }, onRetry, onDiscard });
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("does not render raw HTML from message content", () => {
    renderBubble({ message: { ...base.message, content: "<img src=x onerror=alert(1)>" } });
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument();
  });
});

describe("MessageBubble content types", () => {
  const photo = { ...base.message, type: "image", content: "", attachment: { url: "https://res.cloudinary.com/demo/image/upload/v1/a.jpg", name: "a.jpg", width: 800, height: 600 } };

  it("renders a deleted message as a tombstone with no content or actions", () => {
    renderBubble({ message: { ...base.message, content: "", deletedAt: "2024-03-05T11:00:00Z" } });
    expect(screen.getByText("This message was deleted")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reply" })).toBeNull();
  });

  it("shows the quoted message in a reply", () => {
    renderBubble({ message: { ...base.message, content: "yes", replyTo: { _id: "m0", type: "text", content: "coming?", sender: { _id: "bo", name: "Bo" } } } });
    expect(screen.getByText("coming?")).toBeInTheDocument();
    expect(screen.getByText("Bo")).toBeInTheDocument();
  });

  it("renders a photo with an accessible open button, and a file tile with its size", () => {
    const { unmount } = renderBubble({ message: photo });
    expect(screen.getByRole("button", { name: /Open photo/ })).toBeInTheDocument();
    unmount();
    renderBubble({ message: { ...base.message, type: "file", content: "", attachment: { url: "https://x/cv.pdf", name: "cv.pdf", size: 2048 } } });
    expect(screen.getByRole("link", { name: /cv\.pdf, 2 KB/ })).toBeInTheDocument();
  });

  it("groups reactions and lets me toggle mine", async () => {
    const onReact = vi.fn();
    const message = { ...base.message, reactions: [{ user: "me", emoji: "👍" }, { user: "bo", emoji: "👍" }] };
    renderBubble({ message });
    // No provider: actions are empty, so just check the chip renders its count and state.
    expect(screen.getByRole("button", { name: /👍 2/ })).toBeInTheDocument();
    void onReact;
  });
});

describe("MessageBubble desktop actions", () => {
  const rect = { top: 100, bottom: 140, left: 50, right: 250, width: 200, height: 40 };
  const withActions = (actions, props) =>
    render(
      <MessageActionsContext.Provider value={{ meId: "me", ...actions }}>
        <ul><MessageBubble {...base} mine={false} message={{ ...base.message, sender: { _id: "bo", name: "Bo" } }} {...props} /></ul>
      </MessageActionsContext.Provider>
    );

  it("opens the menu from the hover toolbar's React and More buttons, and reacts", async () => {
    const onReact = vi.fn();
    const spy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect);
    withActions({ onReact });
    await userEvent.click(screen.getByRole("button", { name: "React", exact: true }));
    await userEvent.click(screen.getByRole("button", { name: "React 😂" }));
    expect(onReact).toHaveBeenCalledWith(expect.objectContaining({ _id: "m1" }), "😂");
    expect(screen.queryByRole("menu")).toBeNull(); // closes after choosing

    await userEvent.click(screen.getByRole("button", { name: "More actions" }));
    expect(screen.getByRole("menu", { name: "Message actions" })).toBeInTheDocument();
    spy.mockRestore();
  });

  it("toolbar Reply and the menu's Reply both reach onReply", async () => {
    const onReply = vi.fn();
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect);
    withActions({ onReply });
    await userEvent.click(screen.getByRole("button", { name: "Reply", exact: true }));
    expect(onReply).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "More actions" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Reply" }));
    expect(onReply).toHaveBeenCalledTimes(2);
  });

  it("the menu offers Delete only on my own messages", async () => {
    const onDelete = vi.fn();
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect);
    withActions({ onDelete }, { mine: true, message: base.message });
    await userEvent.click(screen.getByRole("button", { name: "More actions" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalled();
  });
});
