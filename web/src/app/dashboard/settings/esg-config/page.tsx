"use client";
// src/app/dashboard/settings/esg-config/page.tsx
// ESG Configuration Panel for administrators - TerminalUI design system

import { useState, useEffect } from "react";

export default function ESGConfigurationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Config toggles
  const [enableEmissionCalculation, setEnableEmissionCalculation] = useState(true);
  const [requireCsrEvidence, setRequireCsrEvidence] = useState(true);
  const [autoAwardBadges, setAutoAwardBadges] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings?keys=esg_config");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load configuration");
      }

      const config = json.data.esg_config;
      if (config) {
        setEnableEmissionCalculation(config.enableEmissionCalculation ?? true);
        setRequireCsrEvidence(config.requireCsrEvidence ?? true);
        setAutoAwardBadges(config.autoAwardBadges ?? true);
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
          esg_config: {
            enableEmissionCalculation,
            requireCsrEvidence,
            autoAwardBadges
          }
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save configuration");
      }

      setSuccess("ESG configuration variables successfully committed to database registry.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          # ADMIN / SETTINGS / ESG-CONFIGURATION
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          ESG CORE VARIABLES
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Configure calculations constants, operational evidence policies, and auto-gamification behaviors.
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
            RETRIEVING ESG CONFIGURATION RECORDS...
          </span>
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ maxWidth: "600px" }}>
          <div className="card-elevated" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <div className="card-header">CORE CONFIGURATION SWITCHES</div>

            {/* Toggle 1: Emissions Calculation */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                  AUTO EMISSION CALCULATIONS
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Automatically calculate CO2 equivalents from logged carbon transaction units using corresponding emission factors.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnableEmissionCalculation(!enableEmissionCalculation)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  padding: "6px 12px",
                  background: "transparent",
                  border: `1px solid ${enableEmissionCalculation ? "var(--color-primary)" : "var(--color-border-medium)"}`,
                  color: enableEmissionCalculation ? "var(--color-primary)" : "var(--color-text-dim)",
                  borderRadius: "0px",
                  cursor: "pointer",
                  width: "120px",
                  textAlign: "center"
                }}
                disabled={saving}
              >
                {enableEmissionCalculation ? "[x] ENABLED" : "[ ] DISABLED"}
              </button>
            </div>

            <div style={{ borderBottom: "1px dashed var(--color-border-subtle)" }} />

            {/* Toggle 2: CSR Evidence Requirement */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                  CSR EVIDENCE MANDATE
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Mandate that participants upload proof attachments when submitting CSR completion logs before approval status can be set.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRequireCsrEvidence(!requireCsrEvidence)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  padding: "6px 12px",
                  background: "transparent",
                  border: `1px solid ${requireCsrEvidence ? "var(--color-primary)" : "var(--color-border-medium)"}`,
                  color: requireCsrEvidence ? "var(--color-primary)" : "var(--color-text-dim)",
                  borderRadius: "0px",
                  cursor: "pointer",
                  width: "120px",
                  textAlign: "center"
                }}
                disabled={saving}
              >
                {requireCsrEvidence ? "[x] ENABLED" : "[ ] DISABLED"}
              </button>
            </div>

            <div style={{ borderBottom: "1px dashed var(--color-border-subtle)" }} />

            {/* Toggle 3: Auto Award Badges */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                  AUTO-AWARD BADGES
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Evaluate badge criteria automatically and allocate unlocked badge achievements upon challenge completion logs.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoAwardBadges(!autoAwardBadges)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  padding: "6px 12px",
                  background: "transparent",
                  border: `1px solid ${autoAwardBadges ? "var(--color-primary)" : "var(--color-border-medium)"}`,
                  color: autoAwardBadges ? "var(--color-primary)" : "var(--color-text-dim)",
                  borderRadius: "0px",
                  cursor: "pointer",
                  width: "120px",
                  textAlign: "center"
                }}
                disabled={saving}
              >
                {autoAwardBadges ? "[x] ENABLED" : "[ ] DISABLED"}
              </button>
            </div>

            <div 
              className="ascii-divider" 
              style={{ color: "var(--color-border-subtle)", margin: "var(--space-2) 0" }}
            >
              {"─".repeat(40)}
            </div>

            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button
                type="submit"
                disabled={saving}
                className={`btn btn-primary btn-md btn-cli${saving ? " btn-loading" : ""}`}
                style={{ width: "200px" }}
              >
                {saving ? "COMMITTING" : "COMMIT CHANGES"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
