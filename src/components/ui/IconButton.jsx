import { forwardRef } from "react";
import { cn } from "../../lib/cn";

const SIZES = { sm: "h-9 w-9", md: "h-11 w-11" };

/**
 * Icon-only button. `label` is required – it becomes the accessible name.
 * Visual size stays compact but the hit area is always ≥ 44px on touch via ::after.
 */
export const IconButton = forwardRef(function IconButton(
  { label, icon: Icon, size = "md", variant = "ghost", active = false, className, iconSize = 20, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "press relative inline-flex shrink-0 items-center justify-center rounded-full",
        "after:absolute after:-inset-1 after:content-['']",
        SIZES[size],
        variant === "ghost" && "text-ink-2 hover:bg-ink/5 hover:text-ink",
        variant === "solid" && "bg-accent text-accent-fg hover:bg-accent-hover",
        variant === "soft" && "bg-sunken text-ink-2 hover:text-ink",
        active && "bg-accent-soft text-accent-ink",
        "disabled:opacity-40",
        className
      )}
      {...props}
    >
      <Icon size={iconSize} strokeWidth={2} aria-hidden />
    </button>
  );
});
