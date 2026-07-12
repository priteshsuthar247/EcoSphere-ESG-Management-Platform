"use client";
// Sign-up — Tailwind utilities (DESIGN.md)

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", pass: password.length >= 8 },
    { label: "Uppercase", pass: /[A-Z]/.test(password) },
    { label: "Lowercase", pass: /[a-z]/.test(password) },
    { label: "Number", pass: /\d/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {checks.map((c) => (
        <span key={c.label} className={c.pass ? "text-success" : "text-ink-faint"}>
          {c.pass ? "✓" : "○"} {c.label}
        </span>
      ))}
    </div>
  );
}

const inputClass =
  "w-full rounded-xs border border-line-medium bg-surface px-3 py-2 text-[0.9375rem] text-ink outline-none transition focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,117,222,0.15)] disabled:bg-canvas disabled:text-ink-faint";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function validate(): string | null {
    if (name.trim().length < 2) return "Name must be at least 2 characters.";
    if (!email.includes("@")) return "Enter a valid email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
    if (!/\d/.test(password)) return "Password must contain a number.";
    if (password !== confirm) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Registration failed.");
        setLoading(false);
        return;
      }
      setSuccess("Account created. Redirecting…");
      setTimeout(() => router.push(json.data.redirectTo), 1000);
    } catch {
      setError("Network error. Check your connection.");
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen overflow-hidden bg-canvas lg:grid-cols-2">
      <div className="relative hidden flex-col justify-center bg-secondary px-12 py-16 text-white lg:flex">
        <div className="max-w-md">
          <span className="mb-6 inline-flex rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">
            Create account
          </span>
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-white">
            Join your organisation’s ESG workspace.
          </h1>
          <p className="text-base leading-relaxed text-white/80">
            New accounts start as Employee. An admin can elevate roles after registration.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center overflow-y-auto px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px] rounded-lg border border-hairline bg-surface p-8 shadow-soft">
          <div className="mb-6">
            <div className="mb-1.5 text-xs font-semibold text-primary">Register</div>
            <h1 className="mb-1.5 text-[1.625rem] font-bold tracking-tight text-ink">
              Create your account
            </h1>
            <p className="text-sm text-ink-muted">Register as an employee to get started.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-[rgba(224,62,62,0.3)] bg-[rgba(224,62,62,0.06)] px-4 py-3 text-sm text-[#b42318]" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-md border border-[rgba(26,174,57,0.3)] bg-[rgba(26,174,57,0.06)] px-4 py-3 text-sm text-[#0f7a28]" role="status">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-name" className="text-xs font-semibold text-ink-muted">
                Full name
              </label>
              <input
                ref={nameRef}
                id="signup-name"
                className={inputClass}
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-email" className="text-xs font-semibold text-ink-muted">
                Email
              </label>
              <input
                id="signup-email"
                className={inputClass}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-password" className="text-xs font-semibold text-ink-muted">
                Password
              </label>
              <input
                id="signup-password"
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <PasswordStrength password={password} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-confirm" className="text-xs font-semibold text-ink-muted">
                Confirm password
              </label>
              <input
                id="signup-confirm"
                className={`${inputClass}${confirm && confirm !== password ? " border-danger" : ""}`}
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink-muted">
              Role: <strong className="text-ink">Employee</strong>
              <span className="text-ink-faint"> (default)</span>
            </div>
            <button
              type="submit"
              disabled={loading || !name || !email || !password || !confirm}
              className="w-full rounded-full bg-primary px-6 py-2.5 text-base font-medium text-white transition hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-ink-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:text-primary-active">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
