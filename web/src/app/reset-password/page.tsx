"use client";
// Reset password — Notion-inspired design system

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    <div style={{ fontSize: 12, marginTop: 6, display: "flex", flexWrap: "wrap", gap: "8px 12px" }}>
      {checks.map((c) => (
        <span key={c.label} style={{ color: c.pass ? "var(--color-success)" : "var(--color-text-dim)" }}>
          {c.pass ? "✓" : "○"} {c.label}
        </span>
      ))}
    </div>
  );
}

function ResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [verifyingToken, setVerifyingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setVerifyingToken(false);
      return;
    }
    validateToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function validateToken() {
    try {
      const res = await fetch(`/api/auth/reset-password?token=${token}`);
      const json = await res.json();
      setTokenValid(res.ok && json.success);
    } catch {
      setTokenValid(false);
    } finally {
      setVerifyingToken(false);
    }
  }

  function validate(): string | null {
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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Password reset failed.");
      }
      setSuccess("Password updated. Redirecting to sign in…");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setError((err as Error).message);
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
            Secure reset
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
            Choose a new password.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: "rgba(255,255,255,0.78)" }}>
            Use a strong password you don’t reuse on other sites.
          </p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <div style={{ marginBottom: "var(--space-6)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-primary)", marginBottom: 6 }}>
              Reset password
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
              Set new password
            </h1>
          </div>

          {verifyingToken ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-muted)" }}>
              <span className="spinner" /> Verifying link…
            </div>
          ) : !tokenValid ? (
            <div>
              <div className="msg msg-error" style={{ marginBottom: "var(--space-4)" }}>
                This reset link is invalid or has expired.
              </div>
              <Link href="/forgot-password" className="btn btn-primary btn-md btn-full">
                Request a new link
              </Link>
            </div>
          ) : (
            <>
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
                    <label className="form-label" htmlFor="new-password">
                      New password
                    </label>
                    <input
                      id="new-password"
                      className="form-input"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <PasswordStrength password={password} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="confirm-password">
                      Confirm password
                    </label>
                    <input
                      id="confirm-password"
                      className={`form-input${confirm && confirm !== password ? " error" : ""}`}
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="submit"
                    className={`btn btn-primary btn-lg btn-full${loading ? " btn-loading" : ""}`}
                    disabled={loading || !password || !confirm}
                  >
                    {loading ? "Updating…" : "Update password"}
                  </button>
                </div>
              </form>
            </>
          )}

          <div style={{ marginTop: "var(--space-6)", textAlign: "center", fontSize: 14 }}>
            <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--color-bg)" }}>
          <span className="spinner" />
        </div>
      }
    >
      <ResetPasswordFormContent />
    </Suspense>
  );
}
