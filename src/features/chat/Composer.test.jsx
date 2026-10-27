import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = { sendMessage: vi.fn(), emitTyping: vi.fn() };
vi.mock("../../context/ChatContext", () => ({ useChatActions: () => actions }));

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
    expect(actions.sendMessage).toHaveBeenCalledWith(chatId, "hello\nworld");
    expect(field).toHaveValue("");
  });

  it("the send button works too", async () => {
    const { chatId, user, field, send } = setup();
    await user.type(field, "hi");
    await user.click(send);
    expect(actions.sendMessage).toHaveBeenCalledWith(chatId, "hi");
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
