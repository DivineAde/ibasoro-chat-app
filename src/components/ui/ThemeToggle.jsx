import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { IconButton } from "./IconButton";

/** Quick light/dark flip. The full System/Light/Dark choice lives in Settings. */
export function ThemeToggle({ className }) {
  const { resolved, setPreference } = useTheme();
  const dark = resolved === "dark";
  return (
    <IconButton
      className={className}
      label={dark ? "Switch to light theme" : "Switch to dark theme"}
      icon={dark ? Sun : Moon}
      onClick={() => setPreference(dark ? "light" : "dark")}
    />
  );
}
