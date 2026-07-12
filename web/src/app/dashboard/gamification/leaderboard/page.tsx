"use client";
// src/app/dashboard/gamification/leaderboard/page.tsx
// Leaderboard Dashboard - TerminalUI design system

import { useState, useEffect, useCallback } from "react";
import TableFilters, { matchesSearch } from "@/components/TableFilters";
import { useTableSort } from "@/components/useTableSort";
import SortableTh from "@/components/SortableTh";

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
  const [search, setSearch] = useState("");

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

  const filteredEmployees = employees.filter((e) =>
    matchesSearch(search, [e.name, e.email, e.department_name]),
  );
  const filteredDepartments = departments.filter((d) =>
    matchesSearch(search, [d.name, d.code]),
  );

  const getEmployeeSort = useCallback((row: EmployeeRank, key: string): unknown => {
    switch (key) {
      case "employee": return row.name;
      case "department": return row.department_name ?? "";
      case "points": return row.esg_points_balance;
      case "total_xp": return row.total_xp;
      default: return null;
    }
  }, []);

  const getDeptSort = useCallback((row: DepartmentRank, key: string): unknown => {
    switch (key) {
      case "department": return row.name;
      case "env": return Number(row.environmental_score);
      case "soc": return Number(row.social_score);
      case "gov": return Number(row.governance_score);
      case "total_score": return Number(row.total_score);
      default: return null;
    }
  }, []);

  const {
    sorted: sortedEmployees,
    sortKey: empSortKey,
    sortDir: empSortDir,
    toggle: empToggle,
  } = useTableSort(filteredEmployees, getEmployeeSort, "total_xp", "desc");

  const {
    sorted: sortedDepartments,
    sortKey: deptSortKey,
    sortDir: deptSortDir,
    toggle: deptToggle,
  } = useTableSort(filteredDepartments, getDeptSort, "total_score", "desc");

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
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
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setViewMode("individual")}
          className={`chip ${viewMode === "individual" ? "chip-green" : "chip-muted"}`}
          style={{ cursor: "pointer", padding: "8px 16px", fontSize: "12px", fontWeight: "bold" }}
        >
          Individual standings
        </button>
        <button
          type="button"
          onClick={() => setViewMode("departmental")}
          className={`chip ${viewMode === "departmental" ? "chip-green" : "chip-muted"}`}
          style={{ cursor: "pointer", padding: "8px 16px", fontSize: "12px", fontWeight: "bold" }}
        >
          Departmental ESG standings
        </button>
      </div>

      <TableFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={viewMode === "individual" ? "Search employees, department…" : "Search departments…"}
      />

      {loading ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <span className="spinner" />
          <span style={{ marginLeft: "var(--space-3)" }}>
            Loading leaderboard…
          </span>
        </div>
      ) : (
        <div>
          {viewMode === "individual" ? (
            <div>
              <div className="card-header">Individual active standings</div>
              
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="sortable-th" style={{ textAlign: "left", cursor: "default", width: "70px" }}>Rank</th>
                      <SortableTh label="Employee" columnKey="employee" sortKey={empSortKey} sortDir={empSortDir} onSort={empToggle} />
                      <SortableTh label="Department" columnKey="department" sortKey={empSortKey} sortDir={empSortDir} onSort={empToggle} />
                      <SortableTh label="ESG points" columnKey="points" sortKey={empSortKey} sortDir={empSortDir} onSort={empToggle} align="right" />
                      <SortableTh label="Total XP" columnKey="total_xp" sortKey={empSortKey} sortDir={empSortDir} onSort={empToggle} align="right" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-dim)" }}>
                          No employee records found.
                        </td>
                      </tr>
                    ) : (
                      sortedEmployees.map((e, index) => {
                        const rank = index + 1;
                        let rankText = String(rank);
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
                              {e.department_name ? `${e.department_name}` : "None"}
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
            <div>
              <div className="card-header">Departmental ESG scores standings</div>
              
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="sortable-th" style={{ textAlign: "left", cursor: "default", width: "70px" }}>Rank</th>
                      <SortableTh label="Department" columnKey="department" sortKey={deptSortKey} sortDir={deptSortDir} onSort={deptToggle} />
                      <SortableTh label="Env score" columnKey="env" sortKey={deptSortKey} sortDir={deptSortDir} onSort={deptToggle} align="right" />
                      <SortableTh label="Soc score" columnKey="soc" sortKey={deptSortKey} sortDir={deptSortDir} onSort={deptToggle} align="right" />
                      <SortableTh label="Gov score" columnKey="gov" sortKey={deptSortKey} sortDir={deptSortDir} onSort={deptToggle} align="right" />
                      <SortableTh label="Total ESG" columnKey="total_score" sortKey={deptSortKey} sortDir={deptSortDir} onSort={deptToggle} align="right" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDepartments.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-dim)" }}>
                          No departmental scores calculated yet.
                        </td>
                      </tr>
                    ) : (
                      sortedDepartments.map((d, index) => {
                        const rank = index + 1;
                        let rankText = String(rank);
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
