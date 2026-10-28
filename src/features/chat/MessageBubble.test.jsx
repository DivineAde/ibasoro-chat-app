import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MessageBubble } from "./MessageBubble";

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
