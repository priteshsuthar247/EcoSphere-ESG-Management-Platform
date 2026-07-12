"use client";
// Forgot password — Notion-inspired design system

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Reset request failed.");
      }

      setSuccess(json.message || "If that email exists, a reset link has been sent.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div style={{ maxWidth: 440 }}>
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
            Account recovery
          </div>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-1px",
              color: "#fff",
              marginBottom: "var(--space-4)",
            }}
          >
            Reset your password securely.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: "rgba(255,255,255,0.78)" }}>
            We’ll email you a one-time link if the address is registered.
          </p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <div style={{ marginBottom: "var(--space-6)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-primary)", marginBottom: 6 }}>
              Forgot password
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
              Recover access
            </h1>
            <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
              Enter the email associated with your account.
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
                <label className="form-label" htmlFor="forgot-email">
                  Email
                </label>
                <input
                  ref={emailRef}
                  id="forgot-email"
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
              <button
                type="submit"
                className={`btn btn-primary btn-lg btn-full${loading ? " btn-loading" : ""}`}
                disabled={loading || !email}
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </div>
          </form>

          <div style={{ marginTop: "var(--space-6)", textAlign: "center", fontSize: 14, color: "var(--color-text-muted)" }}>
            <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
