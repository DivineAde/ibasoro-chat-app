import { expect, it } from "vitest";
import { validateSignup } from "./validation";

const ok = { name: "Ada", email: "ada@example.com", password: "supersecret", confirm: "supersecret" };

it("accepts a complete form", () => expect(validateSignup(ok)).toEqual({}));

it("reports each problem on its own field", () => {
  const errors = validateSignup({ name: " ", email: "nope", password: "short", confirm: "other" });
  expect(Object.keys(errors).sort()).toEqual(["confirm", "email", "name", "password"]);
});
