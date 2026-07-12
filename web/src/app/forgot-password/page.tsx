"use client";
// src/app/forgot-password/page.tsx
// Forgot Password UI page - TerminalUI design system

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
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

    // Initial console output
    setConsoleLogs([
      `[${new Date().toLocaleTimeString()}] $ initiate --reset-request --user=${email}`,
      `[${new Date().toLocaleTimeString()}] > Verifying database records for email...`
    ]);

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });

      const json = await res.json();

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Reset dispatch failed.");
      }

      setConsoleLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] > Record located. Constructing security signature...`,
        `[${new Date().toLocaleTimeString()}] > Verification token initialized.`,
        `[${new Date().toLocaleTimeString()}] > Outbound transmission accepted by mail server.`,
        `[${new Date().toLocaleTimeString()}] > STATUS: DISPATCHED SUCCESSFULLY.`
      ]);

      setSuccess(json.message || "A verification link has been dispatched to your email.");
    } catch (err) {
      const msg = (err as Error).message;
      setConsoleLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] > ERROR: ${msg}`,
        `[${new Date().toLocaleTimeString()}] > Request aborted.`
      ]);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* ── LEFT PANEL ── */}
      <div className="auth-left">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.12em", marginBottom: "var(--space-4)" }}>
            $ ecosphere --recovery
          </div>

          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "32px", fontWeight: 700, color: "var(--color-primary)", lineHeight: 1.2, marginBottom: "var(--space-6)" }}>
            CREDENTIALS
            <br />
            RECOVERY
          </h1>

          <div style={{ borderLeft: "2px solid var(--color-primary)", paddingLeft: "var(--space-4)", marginBottom: "var(--space-8)" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)", lineHeight: "20px" }}>
              Enter your registered email address.
              <br />
              A cryptographic token link
              <br />
              will be dispatched to reset
              <br />
              your access parameters.
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Form ── */}
      <div className="auth-right">
        <div className="auth-form-container">
          
          {/* Header */}
          <div style={{ marginBottom: "var(--space-6)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "var(--space-2)" }}>
              # CREDENTIAL RECOVERY SYSTEM
            </div>
            <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--space-1)" }}>
              FORGOT PASSWORD
            </h1>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
              Request a security verification link.
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
              
              {/* Email Input */}
              <div className="form-group">
                <label className="form-label" htmlFor="forgot-email">EMAIL ADDRESS</label>
                <div className="input-wrapper">
                  <span className="input-prompt">&gt;</span>
                  <input
                    ref={emailRef}
                    id="forgot-email"
                    className="form-input"
                    type="email"
                    autoComplete="email"
                    placeholder="user@ecosphere.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                id="forgot-submit"
                type="submit"
                className={`btn btn-primary btn-lg btn-full btn-cli${loading ? " btn-loading" : ""}`}
                disabled={loading || !email}
                style={{ marginTop: "var(--space-2)" }}
              >
                {loading ? "DISPATCHING Link" : "SEND RECOVERY LINK"}
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
                  const isOk = log.includes("STATUS: DISPATCHED");
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
      </div>
    </div>
  );
}
