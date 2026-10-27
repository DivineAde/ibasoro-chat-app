import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, User } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import { uploadImage } from "../../lib/cloudinary";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { Button } from "../../components/ui/Button";
import { Input, PasswordInput } from "../../components/ui/Input";
import { AuthLayout } from "./AuthLayout";
import { AvatarPicker } from "./AvatarPicker";
import { validateSignup } from "./validation";

export default function SignupPage() {
  const { signIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pic, setPic] = useState({ url: "", preview: "", uploading: false });

  useEffect(() => () => pic.preview && URL.revokeObjectURL(pic.preview), [pic.preview]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const pickPhoto = async (file) => {
    setPic({ url: "", preview: URL.createObjectURL(file), uploading: true });
    try {
      const url = await uploadImage(file);
      setPic((p) => ({ ...p, url, uploading: false }));
    } catch (error) {
      setPic({ url: "", preview: "", uploading: false });
      toast.error("Photo not added", error.message);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = validateSignup(form);
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    setFormError("");
    try {
      const { data } = await api.post("/user", {
        name: form.name,
        email: form.email,
        password: form.password,
        pic: pic.url || undefined,
      });
      signIn(data);
      navigate("/chat", { replace: true });
    } catch (error) {
      setFormError(errorMessage(error, "We couldn't create your account."));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-accent-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <AvatarPicker name={form.name} src={pic.preview} uploading={pic.uploading} onPick={pickPhoto} label="Add a profile photo" />
        <Input label="Name" name="name" autoComplete="name" icon={User} placeholder="Your name" value={form.name} onChange={set("name")} error={errors.name} />
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          icon={Mail}
          placeholder="you@example.com"
          value={form.email}
          onChange={set("email")}
          error={errors.email}
        />
        <PasswordInput
          label="Password"
          name="new-password"
          autoComplete="new-password"
          icon={Lock}
          placeholder="At least 8 characters"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
        />
        <PasswordInput
          label="Confirm password"
          name="confirm-password"
          autoComplete="new-password"
          icon={Lock}
          placeholder="Repeat your password"
          value={form.confirm}
          onChange={set("confirm")}
          error={errors.confirm}
        />

        {formError && (
          <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-2.5 text-subhead text-danger">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} disabled={pic.uploading} className="mt-2 w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
