import { useEffect, useState } from "react";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Switch } from "../../components/ui/Switch";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { useToast } from "../../components/ui/Toast";
import { AvatarPicker } from "../auth/AvatarPicker";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { errorMessage } from "../../lib/api";
import { uploadImage } from "../../lib/cloudinary";
import { isSoundOn, setSoundOn } from "../../lib/sound";
import { disablePush, enablePush, getPushState } from "../../lib/push";
import { updateProfile } from "./chatApi";

const THEMES = [
  { value: "system", label: "Auto", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

function Row({ title, description, children, htmlFor }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-4">
      <label htmlFor={htmlFor} className="min-w-0">
        <span className="block text-subhead font-medium text-ink">{title}</span>
        {description && <span className="block text-footnote text-ink-2">{description}</span>}
      </label>
      {children}
    </div>
  );
}

export function SettingsDialog({ open, onClose }) {
  const { user, updateUser, signOut } = useAuth();
  const { preference, setPreference } = useTheme();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [sound, setSound] = useState(isSoundOn);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [push, setPush] = useState("checking"); // see lib/push.js, plus "checking" | "busy"

  useEffect(() => {
    if (open) getPushState().then(setPush);
  }, [open]);

  const togglePush = async (on) => {
    setPush("busy");
    try {
      if (on) {
        const result = await enablePush();
        if (result === "unavailable") toast.info("Not set up yet", "The server has no push keys configured.");
        else if (result === "blocked") toast.error("Notifications are blocked", "Allow them for this site in your browser settings.");
        setPush(result === "on" ? "on" : result === "blocked" ? "blocked" : "off");
      } else {
        await disablePush();
        setPush("off");
      }
    } catch (error) {
      toast.error("Couldn’t change notifications", errorMessage(error));
      setPush(await getPushState());
    }
  };

  const pushHint = {
    unsupported: "This browser doesn’t support notifications.",
    "needs-install": "On iPhone, add ìbáṣọ̀rọ̀ to your Home Screen first (Share → Add to Home Screen).",
    blocked: "Blocked in your browser settings for this site.",
  }[push];

  useEffect(() => {
    if (open) setName(user.name);
  }, [open, user.name]);

  const changePhoto = async (file) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      const updated = await updateProfile({ pic: url });
      updateUser({ pic: updated.pic });
      toast.success("Photo updated");
    } catch (error) {
      toast.error("Photo not updated", error.response ? errorMessage(error) : error.message);
    } finally {
      setUploading(false);
    }
  };

  const dirty = name.trim() && name.trim() !== user.name;
  const saveName = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile({ name: name.trim() });
      updateUser({ name: updated.name });
      toast.success("Name updated");
    } catch (error) {
      toast.error("Couldn’t save", errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Settings">
      <div className="space-y-6">
        <section aria-label="Profile" className="space-y-4">
          <AvatarPicker name={user.name} src={user.pic} uploading={uploading} onPick={changePhoto} />
          <div className="flex items-end gap-2">
            <Input label="Display name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className="flex-1" />
            <Button variant="secondary" onClick={saveName} loading={saving} disabled={!dirty}>
              Save
            </Button>
          </div>
          <p className="text-footnote text-ink-3">{user.email}</p>
        </section>

        <section aria-label="Appearance" className="space-y-2">
          <h3 className="text-footnote font-semibold uppercase tracking-wide text-ink-3">Appearance</h3>
          <SegmentedControl label="Theme" options={THEMES} value={preference} onChange={setPreference} />
        </section>

        <section aria-label="Notifications" className="rounded-[16px] bg-sunken px-4">
          <Row title="Push notifications" description={pushHint || "Get new messages when the app is closed."} htmlFor="push">
            <Switch
              id="push"
              label="Push notifications"
              checked={push === "on"}
              disabled={Boolean(pushHint) || push === "checking" || push === "busy"}
              onChange={togglePush}
            />
          </Row>
          <div className="h-px bg-line" />
          <Row title="Message sounds" description="Play a soft sound for new messages." htmlFor="sound">
            <Switch
              id="sound"
              label="Message sounds"
              checked={sound}
              onChange={(on) => {
                setSound(on);
                setSoundOn(on);
              }}
            />
          </Row>
        </section>

        <Button variant="danger" icon={LogOut} className="w-full" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </Dialog>
  );
}
