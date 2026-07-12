"use client";
// Sign-up page — Notion-inspired design system (DESIGN.md)

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
    <div
      style={{
        fontSize: 12,
        color: "var(--color-text-dim)",
        lineHeight: 1.6,
        marginTop: 6,
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 12px",
      }}
    >
      {checks.map((c) => (
        <span
          key={c.label}
          style={{ color: c.pass ? "var(--color-success)" : "var(--color-text-dim)" }}
        >
          {c.pass ? "✓" : "○"} {c.label}
        </span>
      ))}
    </div>
  );
}

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
    <div className="auth-page">
      <div className="auth-left">
        <div style={{ position: "relative", zIndex: 1, maxWidth: 440 }}>
          <div
            style={{
              display: "inline-flex",
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: "var(--space-6)",
            }}
          >
            Create account
          </div>
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
            Join your organisation’s ESG workspace.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: "rgba(255,255,255,0.78)" }}>
            New accounts start as Employee. An admin can elevate roles after
            registration.
          </p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <div style={{ marginBottom: "var(--space-6)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-primary)", marginBottom: 6 }}>
              Register
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
              Create your account
            </h1>
            <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
              Register as an employee to get started.
            </p>
          </div>

          {error && (
            <div className="msg msg-error" style={{ marginBottom: "var(--space-4)" }}>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="msg msg-success" style={{ marginBottom: "var(--space-4)" }}>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="signup-name">
                  Full name
                </label>
                <input
                  ref={nameRef}
                  id="signup-name"
                  className="form-input"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="signup-email">
                  Email
                </label>
                <input
                  id="signup-email"
                  className="form-input"
                  type="email"
                  autoComplete="email"
                  placeholder="jane@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="signup-password">
                  Password
                </label>
                <input
                  id="signup-password"
                  className="form-input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min 8 chars, A–Z, a–z, 0–9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <PasswordStrength password={password} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="signup-confirm">
                  Confirm password
                </label>
                <input
                  id="signup-confirm"
                  className={`form-input${confirm && confirm !== password ? " error" : ""}`}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  disabled={loading}
                />
                {confirm && confirm !== password && (
                  <div className="helper-text error">Passwords do not match</div>
                )}
              </div>

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-hairline)",
                  background: "var(--color-bg)",
                  fontSize: 13,
                  color: "var(--color-text-muted)",
                }}
              >
                Role: <strong style={{ color: "var(--color-text-primary)" }}>Employee</strong>
                <span style={{ color: "var(--color-text-dim)" }}> (default for new accounts)</span>
              </div>

              <button
                id="signup-submit"
                type="submit"
                className={`btn btn-primary btn-lg btn-full${loading ? " btn-loading" : ""}`}
                disabled={loading || !name || !email || !password || !confirm}
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </div>
          </form>

          <div
            style={{
              marginTop: "var(--space-6)",
              fontSize: 14,
              color: "var(--color-text-muted)",
              textAlign: "center",
            }}
          >
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
