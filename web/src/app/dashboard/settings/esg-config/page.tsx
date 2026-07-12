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
  const [weightEnvironmental, setWeightEnvironmental] = useState(40);
  const [weightSocial, setWeightSocial] = useState(30);
  const [weightGovernance, setWeightGovernance] = useState(30);
  const [recalculating, setRecalculating] = useState(false);

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
        setWeightEnvironmental(Math.round((config.weightEnvironmental ?? 0.4) * 100));
        setWeightSocial(Math.round((config.weightSocial ?? 0.3) * 100));
        setWeightGovernance(Math.round((config.weightGovernance ?? 0.3) * 100));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const sum = weightEnvironmental + weightSocial + weightGovernance;
    if (sum !== 100) {
      setError(`Pillar weights must sum to 100% (currently ${sum}%).`);
      return;
    }
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
            autoAwardBadges,
            weightEnvironmental: weightEnvironmental / 100,
            weightSocial: weightSocial / 100,
            weightGovernance: weightGovernance / 100,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save configuration");
      }

      setSuccess("ESG configuration saved.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRecalculateScores() {
    setRecalculating(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/reports/scores", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Recalculation failed");
      setSuccess(
        `Scores recalculated for ${json.data?.departments?.length ?? 0} departments. Overall ESG: ${json.data?.overall?.overall ?? "–"}`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRecalculating(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
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
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="msg msg-success" style={{ marginBottom: "var(--space-4)" }}>
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
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={enableEmissionCalculation} readOnly />
                  {enableEmissionCalculation ? "On" : "Off"}
                </span>
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
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={requireCsrEvidence} readOnly />
                  {requireCsrEvidence ? "On" : "Off"}
                </span>
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
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={autoAwardBadges} readOnly />
                  {autoAwardBadges ? "On" : "Off"}
                </span>
              </button>
            </div>

            <div style={{ borderBottom: "1px dashed var(--color-border-subtle)" }} />

            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                Overall ESG pillar weights (must total 100%)
              </div>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12 }}>
                Used when computing department Total Score and organization Overall ESG.
              </p>
              <div className="form-grid-2" style={{ maxWidth: 480 }}>
                <div className="form-group">
                  <label className="form-label">Environmental %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="form-input"
                    value={weightEnvironmental}
                    onChange={(e) => setWeightEnvironmental(Number(e.target.value))}
                    disabled={saving}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Social %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="form-input"
                    value={weightSocial}
                    onChange={(e) => setWeightSocial(Number(e.target.value))}
                    disabled={saving}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Governance %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="form-input"
                    value={weightGovernance}
                    onChange={(e) => setWeightGovernance(Number(e.target.value))}
                    disabled={saving}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sum</label>
                  <div style={{ fontSize: 18, fontWeight: 700, paddingTop: 8 }}>
                    {weightEnvironmental + weightSocial + weightGovernance}%
                  </div>
                </div>
              </div>
            </div>

            <div
              className="ascii-divider"
              style={{ color: "var(--color-border-subtle)", margin: "var(--space-2) 0" }}
            >
              {"─".repeat(40)}
            </div>

            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <button
                type="submit"
                disabled={saving}
                className={`btn btn-primary btn-md${saving ? " btn-loading" : ""}`}
              >
                {saving ? "Saving…" : "Save configuration"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-md"
                disabled={recalculating}
                onClick={handleRecalculateScores}
              >
                {recalculating ? "Recalculating…" : "Recalculate department ESG scores"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
