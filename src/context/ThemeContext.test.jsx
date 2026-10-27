import { act, render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "./ThemeContext";

function Probe() {
  const { preference, resolved, setPreference } = useTheme();
  return (
    <>
      <p data-testid="state">{`${preference}/${resolved}`}</p>
      <button onClick={() => setPreference("dark")}>dark</button>
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.head.innerHTML = '<meta name="theme-color" content="#f7f5f1">';
});

it("follows the system by default, and an explicit choice sets <html>, the browser chrome colour and storage", () => {
  render(<ThemeProvider><Probe /></ThemeProvider>);
  expect(screen.getByTestId("state")).toHaveTextContent("system/light");

  act(() => screen.getByText("dark").click());
  expect(screen.getByTestId("state")).toHaveTextContent("dark/dark");
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(document.querySelector('meta[name="theme-color"]').getAttribute("content")).toBe("#0e0e12");
  expect(JSON.parse(localStorage.getItem("ibasoro:theme"))).toBe("dark");
});
