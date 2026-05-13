import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Database, Lock, ShieldCheck } from "lucide-react";
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
    <div className="app-bg grid min-h-screen place-items-center px-4 py-8">
      <div className="surface grid w-full max-w-5xl overflow-hidden rounded-lg lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="hidden bg-[#123c3a] p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-8 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-md bg-white/[0.12]">
                <Database className="size-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-semibold">Vidravault</span>
            </div>
            <div className="grid gap-3">
              <div className="rounded-lg border border-white/[0.14] bg-white/[0.08] p-4">
                <div className="mb-3 flex items-center justify-between text-sm text-white/[0.72]">
                  <span>CAPTURE</span>
                  <span>READY</span>
                </div>
                <div className="h-2 rounded bg-white/[0.12]">
                  <div className="h-2 w-4/5 rounded bg-[#5eead4]" />
                </div>
              </div>
              <div className="rounded-lg border border-white/[0.14] bg-white/[0.08] p-4">
                <div className="mb-3 flex items-center justify-between text-sm text-white/[0.72]">
                  <span>INDEX</span>
                  <span>SYNC</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <span className="h-12 rounded bg-white/[0.12]" />
                  <span className="h-12 rounded bg-[#fbbf24]/80" />
                  <span className="h-12 rounded bg-white/[0.12]" />
                  <span className="h-12 rounded bg-[#5eead4]/80" />
                  <span className="h-12 rounded bg-white/[0.12]" />
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-white/[0.62]">Local workspace</p>
        </section>

        <form
          className="bg-white p-6 sm:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            void submitLogin();
          }}
        >
          <div className="mb-7 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-md bg-[#e7f5f3] text-[#0f766e]">
              <Lock className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-[#17212b]">Sign in</h1>
              <p className="text-sm text-[#596776]">Vidravault</p>
            </div>
          </div>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-semibold text-[#334252]">Email</span>
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="mb-5 block">
            <span className="mb-1.5 block text-sm font-semibold text-[#334252]">Password</span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? (
            <p className="mb-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
          ) : null}
          <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
            <ShieldCheck className="size-4" aria-hidden="true" />
            Sign in
          </Button>
        </form>
      </div>
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
