"use client";
// src/app/dashboard/settings/notifications/page.tsx
// Notification Settings Panel for administrators - TerminalUI design system

import { useState, useEffect } from "react";

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Alert triggers configuration
  const [emailAlertsCompliance, setEmailAlertsCompliance] = useState(true);
  const [emailAlertsRedemption, setEmailAlertsRedemption] = useState(true);
  const [emailAlertsChallenges, setEmailAlertsChallenges] = useState(true);

  // Test email parameters
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testLogs, setTestLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings?keys=notification_config");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load configuration");
      }

      const config = json.data.notification_config;
      if (config) {
        setEmailAlertsCompliance(config.emailAlertsCompliance ?? true);
        setEmailAlertsRedemption(config.emailAlertsRedemption ?? true);
        setEmailAlertsChallenges(config.emailAlertsChallenges ?? true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_config: {
            emailAlertsCompliance,
            emailAlertsRedemption,
            emailAlertsChallenges
          }
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save configuration");
      }

      setSuccess("Notification preferences successfully saved to system parameters.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    if (!testEmailAddress) return;

    setTesting(true);
    setError("");
    setSuccess("");
    setTestLogs([
      `[${new Date().toLocaleTimeString()}] > Initialising mail transmission agent...`,
      `[${new Date().toLocaleTimeString()}] > Packaging test payload contents...`
    ]);

    try {
      // Simulate stepped connection log
      await new Promise((resolve) => setTimeout(resolve, 800));
      setTestLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] > Dispatched request to outbound API endpoint...`]);

      const res = await fetch("/api/admin/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmailAddress })
      });

      const json = await res.json();

      await new Promise((resolve) => setTimeout(resolve, 600));

      if (!res.ok || !json.success) {
        throw new Error(json.error || "SMTP authentication failed.");
      }

      setTestLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] > Transmission accepted by target mail relay.`,
        `[${new Date().toLocaleTimeString()}] > Verification email sent to: ${testEmailAddress}`,
        `[${new Date().toLocaleTimeString()}] > STATUS CODE: [OK]`
      ]);
      setSuccess(`Outbound mail relay successfully verified for: ${testEmailAddress}`);
    } catch (err) {
      const msg = (err as Error).message;
      setTestLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] > ERROR: ${msg}`,
        `[${new Date().toLocaleTimeString()}] > Check your Gmail configurations in .env.local`
      ]);
      setError(`Verification transmission failed: ${msg}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          # ADMIN / SETTINGS / NOTIFICATIONS
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          NOTIFICATION CHANNELS
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Manage event logging rules, configure system alerts, and verify outgoing mail relay parameters.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
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

      {loading ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <span className="spinner" />
          <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>
            RETRIEVING ALERTS CHANNEL CONFIGURATIONS...
          </span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "var(--space-6)", alignItems: "start" }}>
          
          {/* ── ALERTS TRIGGERS FORM ── */}
          <form onSubmit={handleSave}>
            <div className="card-elevated" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
              <div className="card-header">EMAIL ALERT SETTINGS</div>

              {/* Toggle 1: Compliance Email */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                    COMPLIANCE ISSUES ALERTS
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text-muted)" }}>
                    Instantly dispatch email logs to the department owners when new compliance alerts are raised from audits.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailAlertsCompliance(!emailAlertsCompliance)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    padding: "6px 12px",
                    background: "transparent",
                    border: `1px solid ${emailAlertsCompliance ? "var(--color-primary)" : "var(--color-border-medium)"}`,
                    color: emailAlertsCompliance ? "var(--color-primary)" : "var(--color-text-dim)",
                    borderRadius: "0px",
                    cursor: "pointer",
                    width: "120px",
                    textAlign: "center"
                  }}
                  disabled={saving}
                >
                  {emailAlertsCompliance ? "[x] ENABLED" : "[ ] DISABLED"}
                </button>
              </div>

              <div style={{ borderBottom: "1px dashed var(--color-border-subtle)" }} />

              {/* Toggle 2: Redemption Email */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                    REWARD REDEMPTIONS ALERTS
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text-muted)" }}>
                    Dispatch email verification receipts to employees and notifications to system operators upon reward redemptions.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailAlertsRedemption(!emailAlertsRedemption)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    padding: "6px 12px",
                    background: "transparent",
                    border: `1px solid ${emailAlertsRedemption ? "var(--color-primary)" : "var(--color-border-medium)"}`,
                    color: emailAlertsRedemption ? "var(--color-primary)" : "var(--color-text-dim)",
                    borderRadius: "0px",
                    cursor: "pointer",
                    width: "120px",
                    textAlign: "center"
                  }}
                  disabled={saving}
                >
                  {emailAlertsRedemption ? "[x] ENABLED" : "[ ] DISABLED"}
                </button>
              </div>

              <div style={{ borderBottom: "1px dashed var(--color-border-subtle)" }} />

              {/* Toggle 3: Challenge Completions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                    CHALLENGE PARTICIPATION STATUS
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text-muted)" }}>
                    Notify employees via email logs on approval or rejection of challenge completion proof submissions.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailAlertsChallenges(!emailAlertsChallenges)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    padding: "6px 12px",
                    background: "transparent",
                    border: `1px solid ${emailAlertsChallenges ? "var(--color-primary)" : "var(--color-border-medium)"}`,
                    color: emailAlertsChallenges ? "var(--color-primary)" : "var(--color-text-dim)",
                    borderRadius: "0px",
                    cursor: "pointer",
                    width: "120px",
                    textAlign: "center"
                  }}
                  disabled={saving}
                >
                  {emailAlertsChallenges ? "[x] ENABLED" : "[ ] DISABLED"}
                </button>
              </div>

              <div 
                className="ascii-divider" 
                style={{ color: "var(--color-border-subtle)", margin: "var(--space-2) 0" }}
              >
                {"─".repeat(40)}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={saving}
                  className={`btn btn-primary btn-md btn-cli${saving ? " btn-loading" : ""}`}
                  style={{ width: "200px" }}
                >
                  {saving ? "COMMITTING" : "COMMIT PREFERENCES"}
                </button>
              </div>
            </div>
          </form>

          {/* ── GOOGLE APP PASSWORD VERIFICATION RELAY ── */}
          <div className="card-elevated">
            <div className="card-header">VERIFY EMAIL TRANSMITTER</div>
            
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
              Test Gmail App credentials defined in `.env.local` by sending a styled system verification log.
            </p>

            <form onSubmit={handleSendTest} style={{ marginBottom: "var(--space-4)" }}>
              <div className="form-group" style={{ marginBottom: "var(--space-3)" }}>
                <label className="form-label">RECIPIENT EMAIL</label>
                <div className="input-wrapper">
                  <span className="input-prompt">&gt;</span>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. tester@gmail.com"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    required
                    disabled={testing}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={testing || !testEmailAddress}
                className={`btn btn-secondary btn-md btn-cli btn-full${testing ? " btn-loading" : ""}`}
              >
                {testing ? "TRANSMITTING..." : "SEND TEST EMAIL"}
              </button>
            </form>

            {/* Test Logging console box */}
            {testLogs.length > 0 && (
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "4px" }}>
                  TRANSMISSION LOGS:
                </div>
                <div className="terminal-block" style={{ fontSize: "12px", maxHeight: "200px", overflowY: "auto", whiteSpace: "pre-wrap" }}>
                  {testLogs.map((log, index) => {
                    const isError = log.includes("ERROR");
                    const isOk = log.includes("[OK]");
                    let cls = "t-dim";
                    if (isError) cls = "t-error";
                    else if (isOk) cls = "t-green";
                    
                    return (
                      <div key={index} className={cls}>
                        {log}
                      </div>
                    );
                  })}
                  {testing && <span className="spinner" />}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
