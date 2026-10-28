import { describe, expect, it } from "vitest";
import { groupReactions, myReaction, withReaction } from "./reactions";

const r = (user, emoji) => ({ user, emoji });

describe("reactions", () => {
  it("groups by emoji, counts, and flags mine (populated or bare user ids)", () => {
    const groups = groupReactions([r("a", "👍"), r({ _id: "me" }, "👍"), r("b", "❤️")], "me");
    expect(groups).toEqual([
      { emoji: "👍", count: 2, mine: true },
      { emoji: "❤️", count: 1, mine: false },
    ]);
  });

  it("allows one reaction per person", () => {
    const next = withReaction([r("me", "👍"), r("a", "👍")], "me", "😂");
    expect(next).toEqual([r("a", "👍"), r("me", "😂")]);
    expect(withReaction(next, "me", null)).toEqual([r("a", "👍")]);
    expect(myReaction(next, "me")).toBe("😂");
  });
});
