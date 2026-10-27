import { LogoMark, Wordmark } from "../../components/ui/Logo";
import { ThemeToggle } from "../../components/ui/ThemeToggle";

/** A static peek at the product: three bubbles, no stock illustration. */
function BubblePreview() {
  const row = "max-w-[78%] rounded-bubble px-4 py-2.5 text-subhead shadow-raised";
  return (
    <div aria-hidden className="mt-10 flex w-full max-w-sm flex-col gap-2.5">
      <div className={`${row} self-start rounded-bl-md bg-bubble-in text-ink`}>Ẹ káàbọ̀! Did you get home okay?</div>
      <div className={`${row} self-end rounded-br-md bg-bubble-out text-accent-fg`}>Just landed. Calling you in five.</div>
      <div className={`${row} self-start rounded-bl-md bg-bubble-in text-ink`}>Perfect. Kettle’s on ☕</div>
    </div>
  );
}

export function AuthLayout({ title, subtitle, eyebrow, children, footer }) {
  return (
    <div className="grid h-full overflow-y-auto lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Brand panel – desktop only */}
      <aside className="chat-pattern relative hidden flex-col justify-between bg-accent-soft p-12 lg:flex">
        <div className="flex items-center gap-3">
          <LogoMark size={36} />
          <Wordmark className="text-title3" />
        </div>
        <div>
          <p className="text-footnote font-semibold uppercase tracking-[0.14em] text-accent-ink">
            ìbáṣọ̀rọ̀ · conversation, in Yorùbá
          </p>
          <h2 className="mt-3 max-w-[14ch] text-display text-ink">Talk like you’re in the same room.</h2>
          <BubblePreview />
        </div>
        <p className="text-footnote text-ink-2">Private by default. Fast everywhere.</p>
      </aside>

      <main className="relative flex min-h-full flex-col px-6 pb-[calc(var(--safe-bottom)+24px)] pt-[calc(var(--safe-top)+16px)]">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="flex items-center gap-2.5 lg:hidden">
            <LogoMark size={30} />
            <Wordmark className="text-headline" />
          </div>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8">
          {eyebrow && <p className="text-footnote font-semibold text-accent-ink">{eyebrow}</p>}
          <h1 className="mt-1 text-title1 text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-subhead text-ink-2">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-8 text-center text-subhead text-ink-2">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
