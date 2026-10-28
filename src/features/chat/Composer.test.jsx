import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = { sendMessage: vi.fn(), sendAttachment: vi.fn(), editMessage: vi.fn(), emitTyping: vi.fn() };
vi.mock("../../context/ChatContext", () => ({ useChatActions: () => actions }));
vi.mock("../../components/ui/Toast", () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));

import { Composer } from "./Composer";

// Drafts are remembered per chat id, so each test gets a fresh chat.
let counter = 0;
const setup = (chatId = `c${++counter}`) => {
  const user = userEvent.setup();
  render(<Composer chatId={chatId} />);
  return { chatId, user, field: screen.getByRole("textbox", { name: "Message" }), send: screen.getByRole("button", { name: "Send message" }) };
};

beforeEach(() => {
  actions.sendMessage.mockClear();
  actions.emitTyping.mockClear();
  actions.editMessage.mockClear();
  actions.sendAttachment.mockClear();
});

describe("Composer", () => {
  it("cannot send an empty or whitespace-only message", async () => {
    const { user, field, send } = setup();
    expect(send).toBeDisabled();
    await user.type(field, "   ");
    expect(send).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(actions.sendMessage).not.toHaveBeenCalled();
  });

  it("Enter sends and clears; Shift+Enter inserts a new line instead", async () => {
    const { chatId, user, field } = setup();
    await user.type(field, "hello{Shift>}{Enter}{/Shift}world");
    expect(field).toHaveValue("hello\nworld");
    expect(actions.sendMessage).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");
    expect(actions.sendMessage).toHaveBeenCalledWith(chatId, "hello\nworld", { replyTo: undefined });
    expect(field).toHaveValue("");
  });

  it("the send button works too", async () => {
    const { chatId, user, field, send } = setup();
    await user.type(field, "hi");
    await user.click(send);
    expect(actions.sendMessage).toHaveBeenCalledWith(chatId, "hi", { replyTo: undefined });
  });

  it("announces typing once, then stops when the message is sent", async () => {
    const { chatId, user, field } = setup();
    await user.type(field, "abc");
    expect(actions.emitTyping.mock.calls).toEqual([[chatId, true]]);
    await user.keyboard("{Enter}");
    expect(actions.emitTyping).toHaveBeenLastCalledWith(chatId, false);
  });

  it("restores an unsent draft when you come back to the chat", async () => {
    const first = setup("draft-chat");
    await first.user.type(first.field, "half-written");
    document.body.innerHTML = "";
    const { field } = setup("draft-chat");
    expect(field).toHaveValue("half-written");
  });
});

describe("Composer replies and edits", () => {
  it("sends with the message being replied to, then clears the reply", async () => {
    const reply = { _id: "m9", content: "earlier", sender: { _id: "bo", name: "Bo" } };
    const onCancelReply = vi.fn();
    const user = userEvent.setup();
    render(<Composer chatId={`c${++counter}`} meId="me" replyTo={reply} onCancelReply={onCancelReply} />);
    await user.type(screen.getByRole("textbox", { name: "Message" }), "answer");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(actions.sendMessage).toHaveBeenCalledWith(expect.any(String), "answer", { replyTo: reply });
    expect(onCancelReply).toHaveBeenCalled();
  });

  it("edit mode pre-fills the field and saves through editMessage", async () => {
    actions.editMessage.mockResolvedValue(true);
    const onDoneEditing = vi.fn();
    const user = userEvent.setup();
    render(<Composer chatId={`c${++counter}`} meId="me" editing={{ _id: "m1", content: "typo" }} onDoneEditing={onDoneEditing} />);
    const field = screen.getByRole("textbox", { name: "Message" });
    expect(field).toHaveValue("typo");
    await user.type(field, "!");
    await user.click(screen.getByRole("button", { name: "Save edit" }));
    expect(actions.editMessage).toHaveBeenCalledWith(expect.any(String), "m1", "typo!");
    expect(actions.sendMessage).not.toHaveBeenCalled();
    expect(onDoneEditing).toHaveBeenCalled();
  });

  it("Escape leaves edit mode without saving", async () => {
    const onDoneEditing = vi.fn();
    const user = userEvent.setup();
    render(<Composer chatId={`c${++counter}`} meId="me" editing={{ _id: "m1", content: "typo" }} onDoneEditing={onDoneEditing} />);
    await user.click(screen.getByRole("textbox", { name: "Message" }));
    await user.keyboard("{Escape}");
    expect(onDoneEditing).toHaveBeenCalled();
    expect(actions.editMessage).not.toHaveBeenCalled();
  });
});
