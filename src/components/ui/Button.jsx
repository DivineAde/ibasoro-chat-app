import { forwardRef } from "react";
import { cn } from "../../lib/cn";
import { Spinner } from "./Spinner";

const VARIANTS = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover shadow-raised",
  secondary: "bg-sunken text-ink hover:bg-ink/10",
  ghost: "text-ink-2 hover:bg-ink/5 hover:text-ink",
  danger: "bg-danger-soft text-danger hover:bg-danger/20",
  "danger-solid": "bg-danger text-white hover:opacity-90",
};

const SIZES = {
  sm: "h-9 px-3.5 text-footnote gap-1.5 rounded-control",
  md: "h-11 px-5 text-subhead gap-2 rounded-control", // 44px: Apple's minimum touch target
  lg: "h-12 px-6 text-body gap-2 rounded-[14px]",
};

export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", loading = false, icon: Icon, className, children, disabled, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "press inline-flex select-none items-center justify-center whitespace-nowrap font-semibold",
        "disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : Icon ? <Icon size={18} strokeWidth={2} aria-hidden /> : null}
      {children}
    </button>
  );
});
