"use client";
// Policy Acknowledgements — TerminalUI

import { useCallback, useEffect, useState } from "react";

interface Ack {
  id: number;
  user_name: string;
  user_email: string;
  user_department_name: string | null;
  policy_id: number;
  policy_title: string;
  policy_version: string | null;
  policy_version_current: string;
  acknowledged_at: string;
  ip_address: string | null;
}

interface Coverage {
  policy_id: number;
  title: string;
  version: string;
  status: string;
  acknowledged: number;
  active_users: number;
  coverage_percent: number;
}

interface Stats {
  total: number;
  unique_users: number;
  unique_policies: number;
  pending_acks: number;
}

export default function AcknowledgementsPage() {
  const [items, setItems] = useState<Ack[]>([]);
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/governance/acknowledgements");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load acknowledgements");
      setItems(json.data.items ?? []);
      setCoverage(json.data.coverage ?? []);
      setStats(json.data.stats);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          # GOVERNANCE / POLICY-ACKNOWLEDGEMENTS
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          POLICY ACKNOWLEDGEMENTS
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Track who has acknowledged ESG policies and coverage gaps.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      {error && (
        <div className="msg msg-error" style={{ marginBottom: "var(--space-4)" }}>
          <span>[ERR]</span><span>{error}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        {[
          { label: "TOTAL ACKS", value: stats?.total, color: "var(--color-primary)" },
          { label: "USERS", value: stats?.unique_users, color: "var(--color-tertiary)" },
          { label: "POLICIES", value: stats?.unique_policies, color: "var(--color-secondary)" },
          { label: "PENDING", value: stats?.pending_acks, color: "var(--color-error)" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>// {s.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: s.color }}>{s.value ?? "–"}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <span className="spinner" />
          <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>LOADING...</span>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "var(--space-8)" }}>
            <div className="card-header">COVERAGE MATRIX</div>
            {coverage.length === 0 ? (
              <div style={{ padding: "var(--space-6)", border: "1px solid var(--color-border-subtle)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", textAlign: "center" }}>
                // No policies requiring acknowledgement.
              </div>
            ) : (
              <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px dashed var(--color-border-medium)", background: "var(--color-surface)" }}>
                      {["POLICY", "VERSION", "STATUS", "ACKED", "ACTIVE USERS", "COVERAGE"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {coverage.map((c) => (
                      <tr key={c.policy_id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)" }}>{c.title}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>v{c.version}</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <span className={`chip ${c.status === "active" ? "chip-green" : "chip-muted"}`}>{c.status}</span>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-tertiary)" }}>{c.acknowledged}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{c.active_users}</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                            <div style={{ flex: 1, height: "8px", border: "1px solid var(--color-border-medium)", background: "var(--color-bg)", maxWidth: "120px" }}>
                              <div style={{ height: "100%", width: `${Math.min(100, c.coverage_percent)}%`, background: c.coverage_percent >= 80 ? "var(--color-primary)" : c.coverage_percent >= 50 ? "var(--color-secondary)" : "var(--color-error)" }} />
                            </div>
                            <span style={{ color: "var(--color-primary)", fontSize: "12px" }}>{c.coverage_percent}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <div className="card-header">ACKNOWLEDGEMENT LOG</div>
            {items.length === 0 ? (
              <div style={{ padding: "var(--space-6)", border: "1px solid var(--color-border-subtle)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", textAlign: "center" }}>
                // No acknowledgements recorded yet.
              </div>
            ) : (
              <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px dashed var(--color-border-medium)", background: "var(--color-surface)" }}>
                      {["ID", "USER", "DEPT", "POLICY", "VERSION", "ACKED AT", "IP"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((a) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{String(a.id).padStart(3, "0")}</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <div style={{ color: "var(--color-text-primary)" }}>{a.user_name}</div>
                          <div style={{ color: "var(--color-text-dim)", fontSize: "11px" }}>{a.user_email}</div>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{a.user_department_name || "—"}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{a.policy_title}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-tertiary)" }}>v{a.policy_version || a.policy_version_current}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                          {String(a.acknowledged_at).slice(0, 19).replace("T", " ")}
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{a.ip_address || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
