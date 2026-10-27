import { cn } from "../../lib/cn";

/** Two overlapping speech bubbles – a conversation. Uses theme colours. */
export function LogoMark({ size = 32, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="15" className="fill-accent" />
      <path
        className="fill-accent-fg"
        fillOpacity=".5"
        transform="translate(2 0)"
        d="M34 26h10a8 8 0 0 1 8 8v4a8 8 0 0 1-8 8h-1v8.5l-9-8.5h-1a8 8 0 0 1-8-8v-4a8 8 0 0 1 8-8Z"
      />
      <path
        className="fill-accent-fg stroke-accent"
        strokeWidth="3"
        paintOrder="stroke"
        d="M20 12h12a8 8 0 0 1 8 8v8a8 8 0 0 1-8 8h-9l-8 8v-8.4A8 8 0 0 1 12 28v-8a8 8 0 0 1 8-8Z"
      />
    </svg>
  );
}

export function Wordmark({ className }) {
  return <span className={cn("font-bold tracking-tight text-ink", className)}>ìbáṣọ̀rọ̀</span>;
}
