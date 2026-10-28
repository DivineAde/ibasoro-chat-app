import { describe, expect, it } from "vitest";
import { buildRows, canEditMessage, chatPreview, chatTitle, getOtherUser, isDefaultPic, isReadByAll } from "./chat";

const me = { _id: "me", name: "Me" };
const bo = { _id: "bo", name: "Bo Adé" };
const dm = { users: [me, bo], isGroupChat: false };
const at = (time, sender = "bo", id = time) => ({ _id: id, sender: { _id: sender }, createdAt: `2024-03-05T${time}:00Z`, content: id });

describe("chat helpers", () => {
  it("finds the other person and titles the chat", () => {
    expect(getOtherUser(dm, me)).toBe(bo);
    expect(chatTitle(dm, me)).toBe("Bo Adé");
    expect(chatTitle({ isGroupChat: true, chatName: "Crew" }, me)).toBe("Crew");
  });

  it("previews with 'You:' and, in groups, the sender's first name", () => {
    const sentByMe = { ...dm, latestMessage: { sender: { _id: "me" }, content: "yo" } };
    expect(chatPreview(sentByMe, me)).toBe("You: yo");
    const group = { isGroupChat: true, users: [me, bo], latestMessage: { sender: bo, content: "hey" } };
    expect(chatPreview(group, me)).toBe("Bo: hey");
    expect(chatPreview({ ...dm, latestMessage: { sender: bo, content: "hey" } }, me)).toBe("hey");
    expect(chatPreview(dm, me)).toBeNull();
  });

  it("treats the legacy anonymous avatar as 'no picture'", () => {
    expect(isDefaultPic("https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg")).toBe(true);
    expect(isDefaultPic(undefined)).toBe(true);
    expect(isDefaultPic("https://cdn.example/a.png")).toBe(false);
  });

  it("reports read-by-all only when every other member has read it", () => {
    const group = { users: [me, bo, { _id: "cy" }] };
    expect(isReadByAll({ readBy: ["me", "bo"] }, group, "me")).toBe(false);
    expect(isReadByAll({ readBy: [{ _id: "bo" }, "cy"] }, group, "me")).toBe(true);
    expect(isReadByAll({ readBy: [] }, { users: [me] }, "me")).toBe(false);
  });
});

describe("buildRows", () => {
  const rows = (messages) => buildRows(messages, "me", { formatDay: () => "day" });

  it("joins runs from one sender and shows the avatar on the last of a run", () => {
    const out = rows([at("10:00"), at("10:01"), at("10:02")]).filter((r) => r.type === "message");
    expect(out.map((r) => r.position)).toEqual(["first", "middle", "last"]);
    expect(out.map((r) => r.showAvatar)).toEqual([false, false, true]);
    expect(out.map((r) => r.showName)).toEqual([true, false, false]);
  });

  it("breaks a run on a different sender or after 5 minutes", () => {
    const out = rows([at("10:00"), at("10:01", "me"), at("10:20", "me")]).filter((r) => r.type === "message");
    expect(out.map((r) => r.position)).toEqual(["single", "single", "single"]);
    expect(out[1].mine).toBe(true);
  });

  it("inserts a divider whenever the day changes", () => {
    const next = { ...at("10:00", "bo", "next"), createdAt: "2024-03-06T10:00:00Z" };
    expect(rows([at("10:00"), next]).filter((r) => r.type === "day")).toHaveLength(2);
  });
});

describe("message types", () => {
  const chat = { users: [{ _id: "me" }, { _id: "bo" }] };
  const withLatest = (latestMessage) => ({ ...chat, latestMessage });
  it("previews photos, voice notes, files and deletions", () => {
    const me = { _id: "me" };
    const bo = (extra) => ({ sender: { _id: "bo" }, ...extra });
    expect(chatPreview(withLatest(bo({ type: "image", content: "" })), me)).toBe("📷 Photo");
    expect(chatPreview(withLatest(bo({ type: "image", content: "Lagos" })), me)).toBe("📷 Lagos");
    expect(chatPreview(withLatest(bo({ type: "voice" })), me)).toBe("🎤 Voice message");
    expect(chatPreview(withLatest(bo({ type: "file", attachment: { name: "cv.pdf" } })), me)).toBe("📎 cv.pdf");
    expect(chatPreview(withLatest(bo({ content: "secret", deletedAt: "2024-01-01" })), me)).toBe("Message deleted");
  });

  it("allows editing only my own recent text messages", () => {
    const now = Date.parse("2024-01-01T12:00:00Z");
    const mine = { sender: { _id: "me" }, createdAt: "2024-01-01T11:50:00Z" };
    expect(canEditMessage(mine, "me", now)).toBe(true);
    expect(canEditMessage({ ...mine, createdAt: "2024-01-01T11:30:00Z" }, "me", now)).toBe(false);
    expect(canEditMessage({ ...mine, type: "image" }, "me", now)).toBe(false);
    expect(canEditMessage({ ...mine, deletedAt: "x" }, "me", now)).toBe(false);
    expect(canEditMessage({ ...mine, status: "sending" }, "me", now)).toBe(false);
    expect(canEditMessage({ ...mine, sender: { _id: "bo" } }, "me", now)).toBe(false);
  });
});
