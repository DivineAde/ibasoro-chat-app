/** Three bouncing dots inside a received-style bubble. */
export function TypingIndicator({ label }) {
  return (
    <li className="mt-3 flex items-end gap-2 animate-msg-in" style={{ transformOrigin: "bottom left" }}>
      <div
        role="status"
        aria-label={label}
        className="flex h-9 items-center gap-1 rounded-bubble rounded-bl-[6px] bg-bubble-in px-3.5 ring-1 ring-inset ring-line"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-ink-3"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
    </li>
  );
}
