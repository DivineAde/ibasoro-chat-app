import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(cleanup);

// jsdom lacks these browser APIs.
window.matchMedia =
  window.matchMedia ||
  ((query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }));
window.HTMLElement.prototype.scrollTo = function scrollTo() {};
window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
window.IntersectionObserver =
  window.IntersectionObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
