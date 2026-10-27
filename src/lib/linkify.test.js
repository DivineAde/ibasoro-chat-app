import { expect, it } from "vitest";
import { linkify } from "./linkify";

it("splits text into plain and link parts, leaving trailing punctuation outside the link", () => {
  expect(linkify("see https://a.com/x, ok")).toEqual([
    { type: "text", value: "see " },
    { type: "link", value: "https://a.com/x" },
    { type: "text", value: ", ok" },
  ]);
});

it("never produces links for non-http schemes", () => {
  expect(linkify("javascript:alert(1)")).toEqual([{ type: "text", value: "javascript:alert(1)" }]);
});
