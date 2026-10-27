import { cloneElement, createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";

const MenuContext = createContext(null);

/**
 * Small accessible dropdown menu.
 *   <Menu trigger={<IconButton label="More" icon={MoreHorizontal} />}>
 *     <MenuItem icon={User} onSelect={…}>Profile</MenuItem>
 *   </Menu>
 * Arrow keys move between items, Escape closes and returns focus to the trigger.
 */
export function Menu({ trigger, children, align = "end", className }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const menuId = useId();

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.querySelector('[role="menuitem"]')?.focus();
    const onPointer = (e) => !rootRef.current?.contains(e.target) && close(false);
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, close]);

  const onKeyDown = (e) => {
    const items = [...panelRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
    const i = items.indexOf(document.activeElement);
    if (e.key === "Escape") return close();
    if (e.key === "Tab") return close(false);
    if (e.key === "ArrowDown") items[(i + 1) % items.length]?.focus();
    else if (e.key === "ArrowUp") items[(i - 1 + items.length) % items.length]?.focus();
    else if (e.key === "Home") items[0]?.focus();
    else if (e.key === "End") items[items.length - 1]?.focus();
    else return;
    e.preventDefault();
  };

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      {cloneElement(trigger, {
        ref: triggerRef,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": open ? menuId : undefined,
        onClick: () => setOpen((o) => !o),
      })}
      {open && (
        <MenuContext.Provider value={{ close }}>
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            onKeyDown={onKeyDown}
            // Scale from the corner nearest the trigger so it feels anchored to it.
            className={cn(
              "absolute top-full z-30 mt-2 min-w-[220px] animate-pop-in rounded-[16px] bg-raised p-1.5 shadow-overlay",
              align === "end" ? "right-0 origin-top-right" : "left-0 origin-top-left"
            )}
          >
            {children}
          </div>
        </MenuContext.Provider>
      )}
    </div>
  );
}

export function MenuItem({ icon: Icon, onSelect, danger, children, trailing }) {
  const { close } = useContext(MenuContext);
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        close();
        onSelect?.();
      }}
      className={cn(
        "flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-subhead outline-none",
        "transition-colors duration-120 focus-visible:bg-ink/5 hover:bg-ink/5",
        danger ? "text-danger" : "text-ink"
      )}
    >
      {Icon && <Icon size={18} aria-hidden className={danger ? "" : "text-ink-2"} />}
      <span className="flex-1 truncate">{children}</span>
      {trailing}
    </button>
  );
}

export const MenuDivider = () => <div role="separator" className="my-1 h-px bg-line" />;
