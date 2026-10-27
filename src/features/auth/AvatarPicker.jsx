import { useRef } from "react";
import { Camera } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { Spinner } from "../../components/ui/Spinner";

/** Round photo picker. Shows a local preview instantly while the upload runs. */
export function AvatarPicker({ name, src, uploading, onPick, size = "lg", label = "Change photo" }) {
  const input = useRef(null);
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label={label}
        disabled={uploading}
        className="press group relative rounded-full"
      >
        <Avatar name={name || "?"} src={src} size={size} />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity duration-160 group-hover:opacity-100 group-focus-visible:opacity-100">
          {uploading ? <Spinner /> : <Camera size={22} aria-hidden />}
        </span>
        {!uploading && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-fg ring-2 ring-surface">
            <Camera size={14} aria-hidden />
          </span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = ""; // allow picking the same file again
        }}
      />
    </div>
  );
}
