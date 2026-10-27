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
