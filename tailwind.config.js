/** @type {import('tailwindcss').Config} */

// Colours are CSS variables holding space-separated RGB channels (see
// src/styles/index.css) so `bg-accent/10` works and dark mode is a variable swap.
const channel = (name) => `rgb(var(--${name}) / <alpha-value>)`;

// Type scale follows Apple's text styles, adapted to rem. Weight and tracking
// travel with the size so a role (title, headline…) is one class.
const type = (size, line, weight = 400, tracking = "0") => [
  size,
  { lineHeight: line, fontWeight: weight, letterSpacing: tracking },
];

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Manrope"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"Segoe UI"',
          "Roboto",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        display: type("3.25rem", "1.02", 800, "-0.035em"),
        title1: type("1.875rem", "2.25rem", 800, "-0.025em"),
        title2: type("1.375rem", "1.75rem", 700, "-0.018em"),
        title3: type("1.1875rem", "1.5rem", 700, "-0.012em"),
        headline: type("1.0625rem", "1.375rem", 700, "-0.008em"),
        body: type("1rem", "1.4rem", 400, "-0.004em"),
        subhead: type("0.9375rem", "1.25rem", 500, "-0.003em"),
        footnote: type("0.8125rem", "1.125rem", 500),
        caption: type("0.75rem", "1rem", 500, "0.005em"),
      },
      colors: {
        canvas: channel("c-canvas"),
        surface: channel("c-surface"),
        sunken: channel("c-sunken"),
        raised: channel("c-raised"),
        ink: { DEFAULT: channel("c-ink"), 2: channel("c-ink-2"), 3: channel("c-ink-3") },
        accent: {
          DEFAULT: channel("c-accent"),
          hover: channel("c-accent-hover"),
          soft: channel("c-accent-soft"),
          ink: channel("c-accent-ink"),
          fg: channel("c-accent-fg"),
        },
        bubble: { out: channel("c-bubble-out"), in: channel("c-bubble-in") },
        danger: { DEFAULT: channel("c-danger"), soft: channel("c-danger-soft") },
        success: channel("c-success"),
        // Hairlines are complete colours, so no alpha modifier here.
        line: "var(--line)",
      },
      borderRadius: {
        control: "12px",
        bubble: "20px",
      },
      boxShadow: {
        raised: "0 1px 2px rgb(var(--shadow) / 0.08), 0 1px 1px rgb(var(--shadow) / 0.04)",
        overlay:
          "0 0 0 1px var(--line), 0 12px 32px -8px rgb(var(--shadow) / 0.28), 0 4px 10px -4px rgb(var(--shadow) / 0.16)",
      },
      transitionDuration: { 120: "120ms", 160: "160ms" },
      transitionTimingFunction: {
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
        drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      keyframes: {
        "pop-in": { from: { opacity: 0, transform: "scale(0.96)" }, to: { opacity: 1, transform: "scale(1)" } },
        "pop-out": { from: { opacity: 1, transform: "scale(1)" }, to: { opacity: 0, transform: "scale(0.97)" } },
        "sheet-in": { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        "sheet-out": { from: { transform: "translateY(0)" }, to: { transform: "translateY(100%)" } },
        "toast-in": { from: { opacity: 0, transform: "translateY(12px) scale(0.98)" }, to: { opacity: 1, transform: "none" } },
        "fade-in": { from: { opacity: 0 }, to: { opacity: 1 } },
        "fade-out": { from: { opacity: 1 }, to: { opacity: 0 } },
        "msg-in": { from: { opacity: 0, transform: "translateY(6px) scale(0.94)" }, to: { opacity: 1, transform: "none" } },
        "list-in": { from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "none" } },
        "pane-in": { from: { opacity: 0, transform: "translateX(28px)" }, to: { opacity: 1, transform: "none" } },
        "typing-dot": {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: 0.45 },
          "30%": { transform: "translateY(-3px)", opacity: 1 },
        },
        shimmer: { to: { transform: "translateX(100%)" } },
        flash: { "0%, 35%": { backgroundColor: "rgb(var(--c-accent) / 0.22)" }, "100%": { backgroundColor: "rgb(var(--c-accent) / 0)" } },
      },
      animation: {
        "pop-in": "pop-in 180ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "pop-out": "pop-out 130ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "sheet-in": "sheet-in 340ms cubic-bezier(0.32, 0.72, 0, 1) both",
        "sheet-out": "sheet-out 200ms cubic-bezier(0.32, 0.72, 0, 1) both",
        "toast-in": "toast-in 240ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "fade-in": "fade-in 160ms ease-out both",
        "fade-out": "fade-out 140ms ease-out both",
        "msg-in": "msg-in 220ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "list-in": "list-in 280ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "pane-in": "pane-in 260ms cubic-bezier(0.32, 0.72, 0, 1) both",
        "typing-dot": "typing-dot 1.1s ease-in-out infinite",
        flash: "flash 1.6s ease-out both",
      },
    },
  },
  plugins: [],
};
