import { cn } from "../../lib/cn";

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-8 text-center", className)}>
      {Icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Icon size={26} strokeWidth={1.75} aria-hidden />
        </span>
      )}
      <div>
        <h3 className="text-headline text-ink">{title}</h3>
        {description && <p className="mt-1 max-w-[28ch] text-subhead text-ink-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}
