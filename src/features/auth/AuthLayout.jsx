import { LogoMark, Wordmark } from "../../components/ui/Logo";
import { ThemeToggle } from "../../components/ui/ThemeToggle";

/**
 * Sign-in / sign-up shell. On desktop the left half is an image panel: the artwork is
 * `public/auth-hero.svg` (hand-dyed adire cloth, drawn for the app). To use a photo
 * instead, drop it at `public/auth-hero.jpg` and change `HERO` below.
 */
const HERO = "/auth-hero.svg";

export function AuthLayout({ title, subtitle, eyebrow, children, footer }) {
  return (
    <div className="grid h-full overflow-y-auto lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Image panel – desktop only. Text sits on a gradient so it stays legible on any picture. */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden bg-[#1b2166] bg-cover bg-center p-12 text-white lg:flex"
        style={{ backgroundImage: `url(${HERO})` }}
      >
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/0 to-black/65" />

        <div className="relative flex items-center gap-3">
          <LogoMark size={36} className="rounded-[10px] ring-2 ring-white/40" />
          <span className="text-title3 font-bold tracking-tight">ìbáṣọ̀rọ̀</span>
        </div>

        <div className="relative">
          <h2 className="max-w-[12ch] text-display drop-shadow-[0_2px_24px_rgb(0_0_0/0.35)]">Talk like you’re in the same room.</h2>
        </div>
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
