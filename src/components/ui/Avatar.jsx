import { useState } from "react";
import { cn } from "../../lib/cn";
import { initials } from "../../lib/format";
import { isDefaultPic } from "../../lib/chat";
import { Users } from "lucide-react";

const SIZES = {
  xs: "h-7 w-7 text-[11px]",
  sm: "h-9 w-9 text-footnote",
  md: "h-12 w-12 text-subhead",
  lg: "h-20 w-20 text-title3",
  xl: "h-28 w-28 text-title1",
};

const DOT = { xs: "h-2 w-2", sm: "h-2.5 w-2.5", md: "h-3.5 w-3.5", lg: "h-4 w-4", xl: "h-5 w-5" };

const hueOf = (name = "") => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
};

/**
 * Avatar with graceful fallbacks: photo → initials (colour derived from the
 * name, theme-aware) → group icon. Optional online dot.
 */
export function Avatar({ name, src, size = "md", group = false, online, ringClass = "ring-surface", className }) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !isDefaultPic(src) && !failed;

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "inline-flex select-none items-center justify-center overflow-hidden rounded-full font-semibold",
          SIZES[size]
        )}
        style={
          showImage
            ? undefined
            : { "--h": hueOf(name), background: "hsl(var(--h) 45% var(--avatar-bg))", color: "hsl(var(--h) 55% var(--avatar-fg))" }
        }
      >
        {showImage ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            draggable={false}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : group ? (
          <Users size={size === "xs" ? 14 : size === "sm" ? 18 : 22} aria-hidden />
        ) : (
          initials(name)
        )}
      </span>
      {online && (
        <span
          aria-label="Online"
          className={cn("absolute bottom-0 right-0 rounded-full bg-success ring-2", DOT[size], ringClass)}
        />
      )}
    </span>
  );
}
