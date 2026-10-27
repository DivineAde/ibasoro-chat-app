import { cn } from "../../lib/cn";

export function Switch({ checked, onChange, label, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "press relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ease-out",
        checked ? "bg-success" : "bg-ink/20"
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-[27px] w-[27px] rounded-full bg-white shadow-raised",
          "transition-transform duration-200 ease-out",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}
