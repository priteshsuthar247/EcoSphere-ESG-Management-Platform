"use client";
// src/app/signup/page.tsx
// Sign-up page — TerminalUI design system

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "min 8 chars", pass: password.length >= 8 },
    { label: "uppercase", pass: /[A-Z]/.test(password) },
    { label: "lowercase", pass: /[a-z]/.test(password) },
    { label: "number", pass: /\d/.test(password) },
  ];

  if (!password) return null;

  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        color: "var(--color-text-dim)",
        lineHeight: "20px",
        marginTop: "4px",
      }}
    >
      {checks.map((c) => (
        <span
          key={c.label}
          style={{
            marginRight: "12px",
            color: c.pass ? "var(--color-primary)" : "var(--color-text-dim)",
          }}
        >
          {c.pass ? "[x]" : "[ ]"} {c.label}
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

      setSuccess("Account created. Redirecting...");
      setTimeout(() => router.push(json.data.redirectTo), 1000);
    } catch {
      setError("Network error. Check your connection.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* ── LEFT PANEL ── */}
      <div className="auth-left">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-text-dim)",
              letterSpacing: "0.12em",
              marginBottom: "var(--space-4)",
            }}
          >
            $ ecosphere --register
          </div>

          <h1
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "32px",
              fontWeight: 700,
              color: "var(--color-primary)",
              lineHeight: 1.2,
              marginBottom: "var(--space-6)",
            }}
          >
            NEW USER
            <br />
            REGISTRATION
          </h1>

          <div
            style={{
              borderLeft: "2px solid var(--color-primary)",
              paddingLeft: "var(--space-4)",
              marginBottom: "var(--space-8)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                color: "var(--color-text-muted)",
                lineHeight: "20px",
              }}
            >
              All new accounts are assigned
              <br />
              the{" "}
              <span style={{ color: "var(--color-secondary)" }}>EMPLOYEE</span> role
              <br />
              by default. Role elevation
              <br />
              requires admin approval.
            </p>
          </div>

          {/* Role table */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              lineHeight: "20px",
            }}
          >
            <div style={{ color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>
              {"// AVAILABLE ROLES"}
            </div>
            {[
              { role: "ADMIN", access: "Full system access", color: "var(--color-error)" },
              { role: "CEO", access: "Executive overview", color: "var(--color-secondary)" },
              { role: "DEPT HEAD", access: "Department control", color: "var(--color-tertiary)" },
              { role: "EMPLOYEE", access: "Self-service portal", color: "var(--color-primary)" },
            ].map((r) => (
              <div
                key={r.role}
                style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}
              >
                <span style={{ color: "var(--color-text-dim)" }}>
                  {r.role === "EMPLOYEE" ? "(*)" : "( )"}
                </span>
                <span style={{ color: r.color, minWidth: "90px" }}>{r.role}</span>
                <span style={{ color: "var(--color-text-dim)" }}>{r.access}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Sign-up form ── */}
      <div className="auth-right">
        <div className="auth-form-container">
          {/* Header */}
          <div style={{ marginBottom: "var(--space-6)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--color-text-dim)",
                letterSpacing: "0.1em",
                marginBottom: "var(--space-2)",
              }}
            >
              # NEW USER REGISTRATION
            </div>
            <h1
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "24px",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                marginBottom: "var(--space-1)",
              }}
            >
              CREATE ACCOUNT
            </h1>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                color: "var(--color-text-muted)",
              }}
            >
              Register a new employee account.
            </p>
          </div>

          <div
            className="ascii-divider"
            style={{ color: "var(--color-border-medium)", fontSize: "12px" }}
          >
            {"─".repeat(48)}
          </div>

          {/* Error / Success */}
          {error && (
            <div className="msg msg-error" style={{ marginBottom: "var(--space-4)" }}>
              <span>[ERR]</span>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="msg msg-success" style={{ marginBottom: "var(--space-4)" }}>
              <span>[OK]</span>
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {/* Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="signup-name">
                  FULL NAME
                </label>
                <div className="input-wrapper">
                  <span className="input-prompt">&gt;</span>
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
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label" htmlFor="signup-email">
                  EMAIL ADDRESS
                </label>
                <div className="input-wrapper">
                  <span className="input-prompt">&gt;</span>
                  <input
                    id="signup-email"
                    className="form-input"
                    type="email"
                    autoComplete="email"
                    placeholder="jane@ecosphere.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="signup-password">
                  PASSWORD
                </label>
                <div className="input-wrapper">
                  <span className="input-prompt">&gt;</span>
                  <input
                    id="signup-password"
                    className="form-input"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Min 8 chars, A-Z, a-z, 0-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <PasswordStrength password={password} />
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="signup-confirm">
                  CONFIRM PASSWORD
                </label>
                <div className="input-wrapper">
                  <span className="input-prompt">&gt;</span>
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
                </div>
                {confirm && confirm !== password && (
                  <div className="helper-text error">[x] Passwords do not match</div>
                )}
              </div>

              {/* Role display (read-only) */}
              <div className="form-group">
                <label className="form-label">ASSIGNED ROLE</label>
                <div
                  style={{
                    padding: "8px 12px",
                    border: "1px solid var(--color-border-subtle)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "14px",
                    color: "var(--color-primary)",
                    background: "var(--color-surface)",
                    letterSpacing: "0.04em",
                  }}
                >
                  (*) EMPLOYEE
                </div>
                <div className="helper-text">
                  {"// All registrations default to employee role"}
                </div>
              </div>

              {/* Submit */}
              <button
                id="signup-submit"
                type="submit"
                className={`btn btn-primary btn-lg btn-full btn-cli${loading ? " btn-loading" : ""}`}
                disabled={loading || !name || !email || !password || !confirm}
                style={{ marginTop: "var(--space-2)" }}
              >
                {loading ? "REGISTERING" : "REGISTER"}
              </button>
            </div>
          </form>

          <div
            className="ascii-divider"
            style={{ color: "var(--color-border-medium)", fontSize: "12px" }}
          >
            {"─".repeat(48)}
          </div>

          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              color: "var(--color-text-muted)",
              textAlign: "center",
            }}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              style={{ color: "var(--color-tertiary)", fontWeight: 500 }}
            >
              $ login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
