import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f7f7f3] px-4">
      <form
        className="w-full max-w-sm rounded border border-stone-200 bg-white p-5 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          void submitLogin();
        }}
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded bg-teal-800 text-white">
            <Lock className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-stone-950">Vidravault</h1>
            <p className="text-sm text-stone-600">Sign in</p>
          </div>
        </div>
        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-semibold text-stone-700">Email</span>
          <Input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-semibold text-stone-700">Password</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="mb-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
        <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
          Sign in
        </Button>
      </form>
    </div>
  );

  async function submitLogin() {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      void navigate("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }
}
