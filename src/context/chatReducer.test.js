import { describe, expect, it } from "vitest";
import { chatReducer, initialChatState } from "./chatReducer";

const ME = "me";
const chat = (id, extra = {}) => ({ _id: id, users: [{ _id: ME }, { _id: "bo" }], unreadCount: 0, updatedAt: "2024-01-01T00:00:00Z", ...extra });
const msg = (id, extra = {}) => ({ _id: id, chat: "c1", sender: { _id: "bo" }, content: id, createdAt: "2024-01-02T10:00:00Z", readBy: ["bo"], ...extra });
const run = (...actions) => actions.reduce(chatReducer, initialChatState);
const loaded = (...chats) => ({ type: "chats/loaded", chats });
const opened = (chatId, messages = []) => ({ type: "messages/loaded", chatId, messages, hasMore: false });

describe("chat list", () => {
  it("sorts by latest activity, newest first", () => {
    const s = run(loaded(chat("old"), chat("new", { updatedAt: "2024-02-01T00:00:00Z" })));
    expect(s.chats.map((c) => c._id)).toEqual(["new", "old"]);
  });

  it("upsert keeps our unread count when a broadcast carries none", () => {
    const s = run(loaded(chat("c1", { unreadCount: 3 })), { type: "chat/upsert", chat: { _id: "c1", chatName: "Renamed" }, keepUnread: true });
    expect(s.chats[0]).toMatchObject({ chatName: "Renamed", unreadCount: 3 });
  });

  it("removing a chat also drops its cached messages", () => {
    const s = run(loaded(chat("c1")), opened("c1", [msg("m1")]), { type: "chat/removed", chatId: "c1" });
    expect(s.chats).toEqual([]);
    expect(s.messages.c1).toBeUndefined();
  });
});

describe("incoming messages", () => {
  const received = (message, countUnread) => ({ type: "message/received", message, meId: ME, countUnread });

  it("counts unread only for others' messages while the chat is not being watched", () => {
    let s = run(loaded(chat("c1")), opened("c1"), received(msg("m1"), true));
    expect(s.chats[0].unreadCount).toBe(1);
    s = chatReducer(s, received(msg("m2"), false)); // chat is open and visible
    expect(s.chats[0].unreadCount).toBe(1);
    s = chatReducer(s, received(msg("m3", { sender: { _id: ME } }), true)); // my own, from another tab
    expect(s.chats[0].unreadCount).toBe(1);
  });

  it("ignores a duplicate delivery of the same message", () => {
    const m = msg("m1");
    const s = run(loaded(chat("c1")), opened("c1"), received(m, true), received(m, true));
    expect(s.messages.c1.items).toHaveLength(1);
    expect(s.chats[0].unreadCount).toBe(1);
  });

  it("moves the chat to the top and clears the sender's typing state", () => {
    const s = run(
      loaded(chat("c1", { updatedAt: "2024-01-01T00:00:00Z" }), chat("c2", { updatedAt: "2024-01-05T00:00:00Z" })),
      { type: "typing/set", chatId: "c1", userId: "bo", name: "Bo", on: true },
      received(msg("m1", { createdAt: "2024-02-01T00:00:00Z" }), true)
    );
    expect(s.chats[0]._id).toBe("c1");
    expect(s.typing.c1).toEqual({});
  });
});

describe("sending", () => {
  const optimistic = { _id: "tmp-1", chat: "c1", sender: { _id: ME }, content: "hi", createdAt: "2024-01-02T10:00:00Z", status: "sending" };

  it("replaces the optimistic bubble with the server message, with no duplicate when the socket echo arrives first", () => {
    const real = msg("real", { sender: { _id: ME }, content: "hi", readBy: [ME] });
    const s = run(
      loaded(chat("c1")),
      opened("c1"),
      { type: "message/optimistic", chatId: "c1", message: optimistic },
      { type: "message/received", message: real, meId: ME, countUnread: false },
      { type: "message/replaced", chatId: "c1", tempId: "tmp-1", message: real, meId: ME }
    );
    expect(s.messages.c1.items.map((m) => m._id)).toEqual(["real"]);
    expect(s.chats[0].unreadCount).toBe(0);
  });

  it("swaps the optimistic bubble in place when the socket echo wins the race (no flash of two bubbles)", () => {
    const echo = msg("real", { sender: { _id: ME }, content: "hi", readBy: [ME], clientId: "tmp-1" });
    const s = run(
      loaded(chat("c1")),
      opened("c1"),
      { type: "message/optimistic", chatId: "c1", message: optimistic },
      { type: "message/received", message: echo, meId: ME, countUnread: false }
    );
    expect(s.messages.c1.items.map((m) => m._id)).toEqual(["real"]);
  });

  it("marks failures, supports retry and discard", () => {
    let s = run(loaded(chat("c1")), opened("c1"), { type: "message/optimistic", chatId: "c1", message: optimistic }, { type: "message/failed", chatId: "c1", tempId: "tmp-1" });
    expect(s.messages.c1.items[0].status).toBe("failed");
    s = chatReducer(s, { type: "message/retrying", chatId: "c1", tempId: "tmp-1" });
    expect(s.messages.c1.items[0].status).toBe("sending");
    s = chatReducer(s, { type: "message/discarded", chatId: "c1", tempId: "tmp-1" });
    expect(s.messages.c1.items).toEqual([]);
  });

  it("keeps unsent messages when history is (re)loaded", () => {
    const s = run(loaded(chat("c1")), opened("c1"), { type: "message/optimistic", chatId: "c1", message: { ...optimistic, status: "failed" } }, opened("c1", [msg("m1")]));
    expect(s.messages.c1.items.map((m) => m._id)).toEqual(["m1", "tmp-1"]);
  });
});

describe("history paging", () => {
  it("prepends older pages without duplicating", () => {
    const s = run(
      loaded(chat("c1")),
      opened("c1", [msg("m3"), msg("m4")]),
      { type: "messages/older", chatId: "c1", messages: [msg("m1"), msg("m2"), msg("m3")], hasMore: false }
    );
    expect(s.messages.c1.items.map((m) => m._id)).toEqual(["m1", "m2", "m3", "m4"]);
    expect(s.messages.c1.hasMore).toBe(false);
  });
});

describe("read receipts, presence and typing", () => {
  it("stamps a reader on messages they did not send", () => {
    const mine = msg("m1", { sender: { _id: ME }, readBy: [ME] });
    const s = run(loaded(chat("c1", { latestMessage: mine })), opened("c1", [mine]), { type: "messages/readBy", chatId: "c1", userId: "bo" });
    expect(s.messages.c1.items[0].readBy).toEqual([ME, "bo"]);
    expect(s.chats[0].latestMessage.readBy).toEqual([ME, "bo"]);
  });

  it("tracks who is online and when they were last seen", () => {
    let s = run({ type: "presence/list", ids: ["bo"] });
    expect(s.online).toEqual({ bo: true });
    s = chatReducer(s, { type: "presence/update", userId: "bo", online: false, lastSeenAt: "2024-01-01T00:00:00Z" });
    expect(s.online).toEqual({});
    expect(s.lastSeen.bo).toBe("2024-01-01T00:00:00Z");
  });

  it("marking a chat read zeroes its badge", () => {
    const s = run(loaded(chat("c1", { unreadCount: 4 })), { type: "chat/markedRead", chatId: "c1" });
    expect(s.chats[0].unreadCount).toBe(0);
  });

  it("reset returns to the initial state (sign-out)", () => {
    expect(run(loaded(chat("c1")), { type: "reset" })).toEqual(initialChatState);
  });
});
