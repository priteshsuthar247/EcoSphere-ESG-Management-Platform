"use client";
// src/app/reset-password/page.tsx
// Reset Password UI page - TerminalUI design system

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", lineHeight: "20px", marginTop: "4px" }}>
      {checks.map((c) => (
        <span key={c.label} style={{ marginRight: "12px", color: c.pass ? "var(--color-primary)" : "var(--color-text-dim)" }}>
          {c.pass ? "[x]" : "[ ]"} {c.label}
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
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setVerifyingToken(false);
      return;
    }
    validateToken();
  }, [token]);

  async function validateToken() {
    try {
      const res = await fetch(`/api/auth/reset-password?token=${token}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setTokenValid(true);
      } else {
        setTokenValid(false);
      }
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
    if (!token) return;

    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setConsoleLogs([
      `[${new Date().toLocaleTimeString()}] $ commit --password-reset --token=${token.substring(0, 8)}...`,
      `[${new Date().toLocaleTimeString()}] > Verifying cryptographic signature...`,
      `[${new Date().toLocaleTimeString()}] > Encrypting security values...`
    ]);

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });

      const json = await res.json();

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Reset password transaction aborted.");
      }

      setConsoleLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] > Signature validated successfully.`,
        `[${new Date().toLocaleTimeString()}] > Database registry values updated.`,
        `[${new Date().toLocaleTimeString()}] > Reset token purged.`,
        `[${new Date().toLocaleTimeString()}] > STATUS: COMMIT COMPLETED.`
      ]);

      setSuccess("Your password has been successfully configured. Redirecting to login...");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      const msg = (err as Error).message;
      setConsoleLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] > ERROR: ${msg}`,
        `[${new Date().toLocaleTimeString()}] > Transaction rejected.`
      ]);
      setError(msg);
      setLoading(false);
    }
  }

  if (verifyingToken) {
    return (
      <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
        <span className="spinner" />
        <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>
          VERIFYING SECURITY SIGNATURE...
        </span>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="auth-form-container">
        <div className="msg msg-error" style={{ marginBottom: "var(--space-6)" }}>
          <span>[SYSTEM ALERT]</span>
          <span>THE SECURITY VERIFICATION TOKEN IS INVALID OR HAS EXPIRED.</span>
        </div>
        <div style={{ border: "1px dashed var(--color-border-medium)", padding: "var(--space-4)", marginBottom: "var(--space-6)", fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-dim)", lineHeight: "20px" }}>
          // DIAGNOSTICS:<br />
          - Verification tokens expire exactly 60 minutes after dispatch.<br />
          - Tokens can only be consumed once.
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", textAlign: "center" }}>
          <Link href="/forgot-password" className="btn btn-primary btn-md btn-cli btn-full">
            REQUEST NEW SECURITY TOKEN
          </Link>
          <div style={{ marginTop: "var(--space-4)" }}>
            <Link href="/login" style={{ color: "var(--color-text-muted)" }}>
              &lt; Return to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form-container">
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "var(--space-2)" }}>
          # CONFIGURATION SECURITY CONSOLE
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--space-1)" }}>
          RESET PASSWORD
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Configure a new credential access set.
        </p>
      </div>

      <div className="ascii-divider" style={{ color: "var(--color-border-medium)", fontSize: "12px" }}>
        {"─".repeat(48)}
      </div>

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

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          
          {/* Password Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="reset-password">NEW PASSWORD</label>
            <div className="input-wrapper">
              <span className="input-prompt">&gt;</span>
              <input
                id="reset-password"
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

          {/* Confirm Password Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="reset-confirm">CONFIRM PASSWORD</label>
            <div className="input-wrapper">
              <span className="input-prompt">&gt;</span>
              <input
                id="reset-confirm"
                className={`form-input${confirm && confirm !== password ? " error" : ""}`}
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter new password"
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

          <button
            id="reset-submit"
            type="submit"
            className={`btn btn-primary btn-lg btn-full btn-cli${loading ? " btn-loading" : ""}`}
            disabled={loading || !password || !confirm}
            style={{ marginTop: "var(--space-2)" }}
          >
            {loading ? "COMMITTING..." : "COMMIT NEW PASSWORD"}
          </button>
        </div>
      </form>

      <div className="ascii-divider" style={{ color: "var(--color-border-medium)", fontSize: "12px" }}>
        {"─".repeat(48)}
      </div>

      {/* Console logger output */}
      {consoleLogs.length > 0 && (
        <div style={{ marginBottom: "var(--space-6)" }}>
          <div className="terminal-block" style={{ fontSize: "12px", maxHeight: "160px", overflowY: "auto" }}>
            {consoleLogs.map((log, index) => {
              const isErr = log.includes("ERROR");
              const isOk = log.includes("STATUS: COMMIT");
              let cls = "t-dim";
              if (isErr) cls = "t-error";
              else if (isOk) cls = "t-green";

              return (
                <div key={index} className={cls}>
                  {log}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)", textAlign: "center" }}>
        Return to authentication?{" "}
        <Link href="/login" style={{ color: "var(--color-tertiary)", fontWeight: 500 }}>
          $ login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-page">
      {/* ── LEFT PANEL ── */}
      <div className="auth-left">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.12em", marginBottom: "var(--space-4)" }}>
            $ ecosphere --recovery-finalize
          </div>

          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "32px", fontWeight: 700, color: "var(--color-primary)", lineHeight: 1.2, marginBottom: "var(--space-6)" }}>
            IDENTITY
            <br />
            VERIFICATION
          </h1>

          <div style={{ borderLeft: "2px solid var(--color-primary)", paddingLeft: "var(--space-4)", marginBottom: "var(--space-8)" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)", lineHeight: "20px" }}>
              Reset parameters validated.<br />
              Please provide a new strong<br />
              credential password to restore<br />
              your profile access logs.
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Form ── */}
      <div className="auth-right">
        <Suspense fallback={
          <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
            <span className="spinner" />
            <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>
              LOADING SECURITY LAYER...
            </span>
          </div>
        }>
          <ResetPasswordFormContent />
        </Suspense>
      </div>
    </div>
  );
}
