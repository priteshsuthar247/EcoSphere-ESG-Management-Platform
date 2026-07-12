"use client";
// Login page — Notion-inspired design system (DESIGN.md)

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="auth-page">
      {/* Dark indigo hero band */}
      <div className="auth-left">
        <div style={{ position: "relative", zIndex: 1, maxWidth: 440 }}>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-1px",
              color: "#ffffff",
              marginBottom: "var(--space-4)",
            }}
          >
            Measure, manage, and improve ESG performance.
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.78)",
              marginBottom: "var(--space-8)",
            }}
          >
            Carbon accounting, social impact, governance compliance, and
            engagement — in one calm workspace.
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="auth-right">
        <div className="auth-form-container">
          <div style={{ marginBottom: "var(--space-6)" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-primary)",
                marginBottom: "var(--space-2)",
              }}
            >
              Sign in
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "-0.4px",
                color: "var(--color-text-primary)",
                marginBottom: 6,
              }}
            >
              Welcome back
            </h1>
            <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
              Enter your credentials to continue to EcoSphere.
            </p>
          </div>

          {error && (
            <div className="msg msg-error" style={{ marginBottom: "var(--space-4)" }}>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">
                  Email
                </label>
                <input
                  ref={emailRef}
                  id="login-email"
                  className="form-input"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  className="form-input"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <button
                id="login-submit"
                type="submit"
                className={`btn btn-primary btn-lg btn-full${loading ? " btn-loading" : ""}`}
                disabled={loading || !email || !password}
                style={{ marginTop: "var(--space-2)" }}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </div>
          </form>

          <div
            style={{
              marginTop: "var(--space-6)",
              fontSize: 14,
              color: "var(--color-text-muted)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div>
              No account?{" "}
              <Link href="/signup" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                Create one
              </Link>
            </div>
            <div>
              <Link href="/forgot-password" style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>
                Forgot password?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
