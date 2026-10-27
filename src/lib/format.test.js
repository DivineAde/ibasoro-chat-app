import { describe, expect, it } from "vitest";
import { formatDayLabel, formatLastSeen, formatListTime, initials } from "./format";

const now = new Date(2024, 2, 20, 15, 0); // Wed 20 Mar 2024, local time
const local = (d, h = 9, m = 41) => new Date(2024, 2, d, h, m).toISOString();

describe("format", () => {
  it("chat-list time: clock today, Yesterday, weekday, then date", () => {
    expect(formatListTime(local(20), now)).toMatch(/9:41/);
    expect(formatListTime(local(19), now)).toBe("Yesterday");
    expect(formatListTime(local(16), now)).toMatch(/\w{3}/);
    expect(formatListTime(new Date(2024, 0, 5).toISOString(), now)).toMatch(/Jan/);
    expect(formatListTime(undefined, now)).toBe("");
  });

  it("day dividers", () => {
    expect(formatDayLabel(local(20), now)).toBe("Today");
    expect(formatDayLabel(local(19), now)).toBe("Yesterday");
    expect(formatDayLabel(new Date(2023, 5, 1).toISOString(), now)).toMatch(/2023/);
  });

  it("last seen", () => {
    expect(formatLastSeen(undefined)).toBe("Offline");
    expect(formatLastSeen(local(20), now)).toMatch(/^Last seen today at/);
    expect(formatLastSeen(local(19), now)).toMatch(/^Last seen yesterday at/);
  });

  it("initials handle accents, single names and empties", () => {
    expect(initials("ọlá adé bello")).toBe("ỌA");
    expect(initials("Bo")).toBe("B");
    expect(initials("")).toBe("?");
  });
});
