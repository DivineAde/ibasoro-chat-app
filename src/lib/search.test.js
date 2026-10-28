import { describe, expect, it } from "vitest";
import { snippet } from "./search";

describe("snippet", () => {
  it("highlights the match case-insensitively and keeps the original casing", () => {
    expect(snippet("Meet me at the Market", "market")).toEqual({ before: "Meet me at the ", match: "Market", after: "" });
  });

  it("trims long text around the match", () => {
    const text = `${"a ".repeat(60)}needle${" b".repeat(60)}`;
    const s = snippet(text, "needle", 10);
    expect(s.before.startsWith("…")).toBe(true);
    expect(s.after.endsWith("…")).toBe(true);
    expect(s.match).toBe("needle");
    expect(s.before.length).toBeLessThan(15);
  });

  it("falls back to the start of the text when nothing matches", () => {
    expect(snippet("report.pdf", "xyz")).toEqual({ before: "report.pdf", match: "", after: "" });
  });
});
