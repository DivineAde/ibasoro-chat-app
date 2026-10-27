import { useId } from "react";
import { cn } from "../../lib/cn";

/** iOS-style segmented control. `options`: [{ value, label, icon? }] */
export function SegmentedControl({ options, value, onChange, label }) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-control bg-sunken p-1">
      {options.map(({ value: v, label: text, icon: Icon }) => {
        const selected = v === value;
        return (
          <label
            key={v}
            className={cn(
              "press relative flex h-9 cursor-pointer select-none items-center justify-center gap-1.5 rounded-[9px] text-footnote font-semibold",
              "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-ink",
              selected ? "bg-surface text-ink shadow-raised" : "text-ink-2 hover:text-ink"
            )}
          >
            <input type="radio" name={name} value={v} checked={selected} onChange={() => onChange(v)} className="sr-only" />
            {Icon && <Icon size={16} aria-hidden />}
            {text}
          </label>
        );
      })}
    </div>
  );
}
