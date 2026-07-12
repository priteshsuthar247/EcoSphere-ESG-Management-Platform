"use client";
// src/app/login/page.tsx
// Login page — TerminalUI design system

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ASCII_LOGO = `
 ______          ____        _                  
|  ____|        / ___| _ __ | |__   ___ _ __ ___ 
| |__   ___ ___\___ \| '_ \| '_ \ / _ \ '__/ _ \\
|  __| / __/ _ \___) | |_) | | | |  __/ | |  __/
|_|____\___\___/____/| .__/|_| |_|\___|_|  \___|
   |___|              |_|                        
`;

const TAGLINE = "ESG MANAGEMENT PLATFORM v2.0.26";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const emailRef = useRef<HTMLInputElement>(null);

  // Terminal boot animation on left panel
  useEffect(() => {
    const lines = [
      "> Initialising EcoSphere kernel...",
      "> Loading ESG modules............. [OK]",
      "> Connecting to database........... [OK]",
      "> Loading compliance engine........ [OK]",
      "> Mounting carbon tracker.......... [OK]",
      "> Starting gamification service.... [OK]",
      "> All systems operational.",
      "",
      "> Awaiting authentication...",
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < lines.length) {
        setBootLines((prev) => [...prev, lines[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 180);
    return () => clearInterval(interval);
  }, []);

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
      {/* ── LEFT PANEL: Terminal boot sequence ── */}
      <div className="auth-left">
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* ASCII Logo */}
          <pre
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-primary)",
              lineHeight: "1.4",
              marginBottom: "var(--space-6)",
              whiteSpace: "pre",
            }}
          >
            {ASCII_LOGO}
          </pre>

          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-text-dim)",
              letterSpacing: "0.15em",
              marginBottom: "var(--space-8)",
            }}
          >
            {TAGLINE}
          </p>

          {/* Boot output */}
          <div
            style={{
              borderLeft: "1px solid var(--color-border-subtle)",
              paddingLeft: "var(--space-4)",
            }}
          >
            {bootLines.map((line, i) => {
              const safeStr = line ?? "";
              const color = safeStr.includes("[OK]")
                ? "var(--color-primary)"
                : safeStr.includes("Awaiting")
                ? "var(--color-secondary)"
                : "var(--color-text-muted)";
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    lineHeight: "20px",
                    color,
                  }}
                >
                  {safeStr || "\u00a0"}
                </div>
              );
            })}
            {bootLines.length > 0 && <span className="cursor" />}
          </div>

          {/* Stats row */}
          <div
            style={{
              marginTop: "var(--space-16)",
              display: "flex",
              gap: "var(--space-8)",
            }}
          >
            {[
              { label: "MODULES", value: "07" },
              { label: "ROLES", value: "04" },
              { label: "STATUS", value: "LIVE" },
            ].map((s) => (
              <div key={s.label}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "var(--color-text-dim)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "var(--color-primary)",
                    lineHeight: "1.2",
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Login form ── */}
      <div className="auth-right">
        <div className="auth-form-container">
          {/* Header */}
          <div style={{ marginBottom: "var(--space-8)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--color-text-dim)",
                letterSpacing: "0.1em",
                marginBottom: "var(--space-2)",
              }}
            >
              # USER AUTHENTICATION
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
              ACCESS TERMINAL
            </h1>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                color: "var(--color-text-muted)",
              }}
            >
              Enter your credentials to authenticate.
            </p>
          </div>

          {/* ASCII divider */}
          <div
            className="ascii-divider"
            style={{ color: "var(--color-border-medium)", fontSize: "12px" }}
          >
            {"─".repeat(48)}
          </div>

          {/* Error message */}
          {error && (
            <div className="msg msg-error" style={{ marginBottom: "var(--space-4)" }}>
              <span>[ERR]</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {/* Email */}
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">
                  EMAIL ADDRESS
                </label>
                <div className="input-wrapper">
                  <span className="input-prompt">&gt;</span>
                  <input
                    ref={emailRef}
                    id="login-email"
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

              {/* Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="login-password">
                  PASSWORD
                </label>
                <div className="input-wrapper">
                  <span className="input-prompt">&gt;</span>
                  <input
                    id="login-password"
                    className="form-input"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    style={{ paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={loading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                    tabIndex={0}
                  >
                    {showPassword ? (
                      /* eye-off */
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      /* eye */
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                className={`btn btn-primary btn-lg btn-full btn-cli${loading ? " btn-loading" : ""}`}
                disabled={loading || !email || !password}
                style={{ marginTop: "var(--space-2)" }}
              >
                {loading ? "AUTHENTICATING" : "AUTHENTICATE"}
              </button>
            </div>
          </form>

          {/* ASCII divider */}
          <div
            className="ascii-divider"
            style={{ color: "var(--color-border-medium)", fontSize: "12px" }}
          >
            {"─".repeat(48)}
          </div>

          {/* Footer links */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              color: "var(--color-text-muted)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}
          >
            <div>
              No account?{" "}
              <Link
                href="/signup"
                style={{
                  color: "var(--color-tertiary)",
                  fontWeight: 500,
                }}
              >
                $ register --new-user
              </Link>
            </div>
            <div>
              Forgot credentials?{" "}
              <Link
                href="/forgot-password"
                style={{
                  color: "var(--color-secondary)",
                  fontWeight: 500,
                }}
              >
                $ recover --forgot-password
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
