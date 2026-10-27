import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/cn";

/** Labelled text field with optional leading icon, trailing slot and error text. */
export const Input = forwardRef(function Input(
  { label, error, hint, icon: Icon, trailing, className, inputClassName, id, ...props },
  ref
) {
  const auto = useId();
  const inputId = id || auto;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-footnote font-medium text-ink-2">
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex h-11 items-center gap-2.5 rounded-control bg-sunken px-3.5",
          "ring-1 ring-inset transition-shadow duration-160 ease-out",
          "focus-within:ring-2 focus-within:ring-accent-ink",
          error ? "ring-danger" : "ring-line"
        )}
      >
        {Icon && <Icon size={18} className="shrink-0 text-ink-3" aria-hidden />}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-3",
            inputClassName
          )}
          {...props}
        />
        {trailing}
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-footnote text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-footnote text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export const PasswordInput = forwardRef(function PasswordInput(props, ref) {
  const [shown, setShown] = useState(false);
  return (
    <Input
      ref={ref}
      type={shown ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="press -mr-1.5 flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:text-ink"
        >
          {shown ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      }
      {...props}
    />
  );
});
