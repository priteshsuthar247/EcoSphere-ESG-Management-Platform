"use client";
// Login — Tailwind utilities (DESIGN.md)

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Authentication failed.");
        setLoading(false);
        return;
      }

      router.push(json.data.redirectTo);
    } catch {
      setError("Network error. Check your connection.");
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen overflow-hidden bg-canvas lg:grid-cols-2">
      {/* Night band hero */}
      <div className="relative hidden flex-col justify-center overflow-hidden bg-secondary px-12 py-16 text-white lg:flex">
        <div className="relative z-10 max-w-md">
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-white">
            Measure, manage, and improve ESG performance.
          </h1>
          <p className="mb-8 text-base leading-relaxed text-white/80">
            Carbon accounting, social impact, governance compliance, and engagement — in one calm
            workspace.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-col items-center justify-center overflow-y-auto bg-canvas px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px] rounded-lg border border-hairline bg-surface p-8 shadow-soft">
          <div className="mb-6">
            <div className="mb-1.5 text-xs font-semibold text-primary">Sign in</div>
            <h1 className="mb-1.5 text-[1.625rem] font-bold tracking-tight text-ink">Welcome back</h1>
            <p className="text-sm text-ink-muted">Enter your credentials to continue to EcoSphere.</p>
          </div>

          {error && (
            <div
              className="mb-4 rounded-md border border-[rgba(224,62,62,0.3)] bg-[rgba(224,62,62,0.06)] px-4 py-3 text-sm text-[#b42318]"
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-xs font-semibold text-ink-muted">
                Email
              </label>
              <input
                ref={emailRef}
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-xs border border-line-medium bg-surface px-3 py-2 text-[0.9375rem] text-ink outline-none transition focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,117,222,0.15)] disabled:bg-canvas disabled:text-ink-faint"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-xs font-semibold text-ink-muted">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-xs border border-line-medium bg-surface px-3 py-2 text-[0.9375rem] text-ink outline-none transition focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,117,222,0.15)] disabled:bg-canvas disabled:text-ink-faint"
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading || !email || !password}
              className="mt-1 w-full rounded-full bg-primary px-6 py-2.5 text-base font-medium text-white transition hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-center text-sm text-ink-muted">
            <div>
              No account?{" "}
              <Link href="/signup" className="font-semibold text-primary hover:text-primary-active">
                Create one
              </Link>
            </div>
            <div>
              <Link href="/forgot-password" className="font-medium text-ink-muted hover:text-ink-secondary">
                Forgot password?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
