import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Input, PasswordInput } from "../../components/ui/Input";
import { AuthLayout } from "./AuthLayout";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.email.trim()) next.email = "Enter your email address.";
    if (!form.password) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    setFormError("");
    try {
      const { data } = await api.post("/user/login", { email: form.email, password: form.password });
      signIn(data);
      navigate("/chat", { replace: true });
    } catch (error) {
      setFormError(errorMessage(error, "We couldn't sign you in."));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Ẹ káàbọ̀"
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="font-semibold text-accent-ink hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
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
          autoFocus
        />
        <PasswordInput
          label="Password"
          name="password"
          autoComplete="current-password"
          icon={Lock}
          placeholder="Your password"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
        />

        {formError && (
          <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-2.5 text-subhead text-danger">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
          Sign in
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            setForm({ email: "guest@example.com", password: "123456" });
            setErrors({});
          }}
        >
          Use the demo account
        </Button>
      </form>
    </AuthLayout>
  );
}
