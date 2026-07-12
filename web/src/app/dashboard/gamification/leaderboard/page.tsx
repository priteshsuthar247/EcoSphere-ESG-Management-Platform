"use client";
// src/app/dashboard/gamification/leaderboard/page.tsx
// Leaderboard Dashboard - TerminalUI design system

import { useState, useEffect } from "react";

interface EmployeeRank {
  id: number;
  name: string;
  email: string;
  department_name: string | null;
  total_xp: number;
  esg_points_balance: number;
}

interface DepartmentRank {
  id: number;
  name: string;
  code: string;
  total_score: string;
  environmental_score: string;
  social_score: string;
  governance_score: string;
}

export default function LeaderboardPage() {
  const [employees, setEmployees] = useState<EmployeeRank[]>([]);
  const [departments, setDepartments] = useState<DepartmentRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Standings view toggle: 'individual' | 'departmental'
  const [viewMode, setViewMode] = useState<"individual" | "departmental">("individual");

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/gamification/leaderboard");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load leaderboard database logs");
      }

      setEmployees(json.data.employees);
      setDepartments(json.data.departments);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          # ADMIN / GAMIFICATION / LEADERBOARD
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          ORGANIZATIONAL STANDINGS
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          View active rankings of employees by XP points and departments by aggregated ESG total scores.
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

      {/* Standings mode selector toggles */}
      <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
        <button
          onClick={() => setViewMode("individual")}
          className={`chip ${viewMode === "individual" ? "active" : "chip-muted"}`}
          style={{ cursor: "pointer", padding: "8px 16px", fontSize: "12px", fontWeight: "bold" }}
        >
          [INDIVIDUAL STANDINGS]
        </button>
        <button
          onClick={() => setViewMode("departmental")}
          className={`chip ${viewMode === "departmental" ? "active" : "chip-muted"}`}
          style={{ cursor: "pointer", padding: "8px 16px", fontSize: "12px", fontWeight: "bold" }}
        >
          [DEPARTMENTAL ESG STANDINGS]
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <span className="spinner" />
          <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>
            RETRIEVING LEADERBOARD DIRECTORIES...
          </span>
        </div>
      ) : (
        <div>
          {viewMode === "individual" ? (
            /* ── INDIVIDUAL LEADERBOARD ── */
            <div>
              <div className="card-header">INDIVIDUAL ACTIVE STANDINGS</div>
              
              <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px dashed var(--color-border-medium)", background: "var(--color-surface)" }}>
                      <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)", width: "70px" }}>RANK</th>
                      <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>EMPLOYEE</th>
                      <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>DEPARTMENT</th>
                      <th style={{ textAlign: "right", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>ESG POINTS BALANCE</th>
                      <th style={{ textAlign: "right", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>TOTAL EXPERIENCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-dim)" }}>
                          {"// NO EMPLOYEE RECORDS COMMITTED IN SYSTEM DATABASE"}
                        </td>
                      </tr>
                    ) : (
                      employees.map((e, index) => {
                        const rank = index + 1;
                        let rankText = `#${rank}`;
                        let rowBg = "transparent";
                        let nameColor = "var(--color-text-primary)";
                        
                        if (rank === 1) {
                          rankText = "★ #1";
                          rowBg = "rgba(0, 255, 65, 0.04)";
                          nameColor = "var(--color-primary)";
                        } else if (rank === 2) {
                          rankText = "✦ #2";
                          rowBg = "rgba(0, 191, 255, 0.02)";
                        } else if (rank === 3) {
                          rankText = "✦ #3";
                          rowBg = "rgba(255, 102, 0, 0.01)";
                        }

                        return (
                          <tr 
                            key={e.id} 
                            style={{ 
                              borderBottom: "1px solid var(--color-border-subtle)", 
                              background: rowBg
                            }}
                          >
                            <td style={{ padding: "10px var(--space-3)", fontWeight: "bold", color: rank <= 3 ? "var(--color-primary)" : "var(--color-text-dim)" }}>
                              {rankText}
                            </td>
                            <td style={{ padding: "10px var(--space-3)" }}>
                              <div style={{ color: nameColor, fontWeight: rank <= 3 ? 700 : 500 }}>
                                {e.name}
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>
                                {e.email}
                              </div>
                            </td>
                            <td style={{ padding: "10px var(--space-3)", color: e.department_name ? "var(--color-text-primary)" : "var(--color-text-dim)" }}>
                              {e.department_name ? `> ${e.department_name}` : "// NONE"}
                            </td>
                            <td style={{ padding: "10px var(--space-3)", textAlign: "right", color: "var(--color-secondary)" }}>
                              {e.esg_points_balance} pts
                            </td>
                            <td style={{ padding: "10px var(--space-3)", textAlign: "right", color: "var(--color-primary)", fontWeight: "bold" }}>
                              {e.total_xp} XP
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ── DEPARTMENTAL LEADERBOARD ── */
            <div>
              <div className="card-header">DEPARTMENTAL ESG SCORES STANDINGS</div>
              
              <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px dashed var(--color-border-medium)", background: "var(--color-surface)" }}>
                      <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)", width: "70px" }}>RANK</th>
                      <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>DEPARTMENT</th>
                      <th style={{ textAlign: "right", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>ENV SCORE</th>
                      <th style={{ textAlign: "right", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>SOC SCORE</th>
                      <th style={{ textAlign: "right", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>GOV SCORE</th>
                      <th style={{ textAlign: "right", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>TOTAL ESG SCORE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-dim)" }}>
                          {"// NO DEPARTMENTAL SCORES CALCULATED YET"}
                        </td>
                      </tr>
                    ) : (
                      departments.map((d, index) => {
                        const rank = index + 1;
                        let rankText = `#${rank}`;
                        let rowBg = "transparent";
                        
                        if (rank === 1) {
                          rankText = "★ #1";
                          rowBg = "rgba(0, 255, 65, 0.04)";
                        }

                        return (
                          <tr 
                            key={d.id} 
                            style={{ 
                              borderBottom: "1px solid var(--color-border-subtle)", 
                              background: rowBg
                            }}
                          >
                            <td style={{ padding: "10px var(--space-3)", fontWeight: "bold", color: rank === 1 ? "var(--color-primary)" : "var(--color-text-dim)" }}>
                              {rankText}
                            </td>
                            <td style={{ padding: "10px var(--space-3)" }}>
                              <span style={{ color: "var(--color-text-primary)", fontWeight: "bold" }}>
                                {d.name}
                              </span>
                              <span style={{ color: "var(--color-secondary)", fontSize: "11px", marginLeft: "8px" }}>
                                ({d.code})
                              </span>
                            </td>
                            <td style={{ padding: "10px var(--space-3)", textAlign: "right", color: "var(--color-primary)" }}>
                              {d.environmental_score} / 100
                            </td>
                            <td style={{ padding: "10px var(--space-3)", textAlign: "right", color: "var(--color-tertiary)" }}>
                              {d.social_score} / 100
                            </td>
                            <td style={{ padding: "10px var(--space-3)", textAlign: "right", color: "var(--color-secondary)" }}>
                              {d.governance_score} / 100
                            </td>
                            <td style={{ padding: "10px var(--space-3)", textAlign: "right", color: "var(--color-primary)", fontWeight: "bold" }}>
                              {d.total_score} / 100
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
