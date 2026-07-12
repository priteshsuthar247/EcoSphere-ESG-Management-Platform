"use client";
// src/app/dashboard/reports/builder/page.tsx
// Custom Report Builder interface - TerminalUI design system

import { useState, useEffect, useCallback } from "react";
import { useTableSort } from "@/components/useTableSort";
import SortableTh from "@/components/SortableTh";

interface Department {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  name: string;
  email: string;
}

interface ReportRow {
  id: number;
  date: string;
  module: string;
  department_name: string | null;
  employee_name: string | null;
  metric_name: string;
  metric_value: string;
}

export default function CustomReportBuilderPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  
  // Loading & states
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters State
  const [filterModule, setFilterModule] = useState("all");
  const [filterDeptId, setFilterDeptId] = useState("all");
  const [filterEmployeeId, setFilterEmployeeId] = useState("all");
  const [filterChallengeId, setFilterChallengeId] = useState("all");
  const [filterCategoryId, setFilterCategoryId] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [challenges, setChallenges] = useState<{ id: number; title: string }[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [docType, setDocType] = useState<"csv" | "excel" | "pdf">("csv");
  const [exportDate, setExportDate] = useState("");

  useEffect(() => {
    fetchMetadata();
    setExportDate(new Date().toLocaleDateString());
  }, []);

  async function fetchMetadata() {
    setLoadingMetadata(true);
    setError("");
    try {
      const [deptsRes, usersRes, chRes, catRes] = await Promise.all([
        fetch("/api/admin/departments?dropdown=true"),
        fetch("/api/admin/users"),
        fetch("/api/gamification/challenges"),
        fetch("/api/admin/categories"),
      ]);

      const deptsJson = await deptsRes.json();
      const usersJson = await usersRes.json();

      if (!deptsRes.ok || !deptsJson.success) {
        throw new Error(deptsJson.error || "Failed to load departments");
      }
      if (!usersRes.ok || !usersJson.success) {
        throw new Error(usersJson.error || "Failed to load employees list");
      }

      setDepartments(deptsJson.data);
      setEmployees(usersJson.data);

      if (chRes.ok) {
        const chJson = await chRes.json();
        if (chJson.success) {
          setChallenges(
            (chJson.data as { id: number; title: string }[]).map((c) => ({
              id: c.id,
              title: c.title,
            })),
          );
        }
      }
      if (catRes.ok) {
        const catJson = await catRes.json();
        if (catJson.success) {
          setCategories(
            (catJson.data as { id: number; name: string }[]).map((c) => ({
              id: c.id,
              name: c.name,
            })),
          );
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMetadata(false);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError("");
    setSuccess("");
    setReportRows([]);

    const payload = {
      module: filterModule,
      departmentId: filterDeptId === "all" ? null : parseInt(filterDeptId, 10),
      employeeId: filterEmployeeId === "all" ? null : parseInt(filterEmployeeId, 10),
      challengeId: filterChallengeId === "all" ? null : parseInt(filterChallengeId, 10),
      categoryId: filterCategoryId === "all" ? null : parseInt(filterCategoryId, 10),
      startDate: filterStartDate || null,
      endDate: filterEndDate || null,
    };

    try {
      const res = await fetch("/api/reports/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Generation query failed");
      }

      setReportRows(json.data);
      setSuccess(`Report compiled successfully. Retrieved ${json.data.length} records.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleExport(format: "csv" | "excel") {
    if (reportRows.length === 0) return;
    
    setExporting(true);
    setError("");
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: reportRows,
          format
        })
      });

      if (!res.ok) {
        throw new Error(`Outbound ${format.toUpperCase()} compile failed`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const extension = format === "excel" ? "xls" : "csv";
      a.download = `EcoSphere_ESG_Report_${new Date().toISOString().split("T")[0]}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  function handlePrintPDF() {
    window.print();
  }

  const getReportSort = useCallback((row: ReportRow, key: string): unknown => {
    switch (key) {
      case "date": return row.date;
      case "module": return row.module;
      case "department": return row.department_name ?? "";
      case "employee": return row.employee_name ?? "";
      case "metric": return row.metric_name;
      case "value": return row.metric_value;
      default: return null;
    }
  }, []);

  const {
    sorted: sortedReportRows,
    sortKey: reportSortKey,
    sortDir: reportSortDir,
    toggle: reportToggle,
  } = useTableSort(reportRows, getReportSort, "date", "desc");

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide navigation header, sidebar, filters form and action buttons */
          nav, aside, header, form, button, .btn, .no-print {
            display: none !important;
          }
          /* Expand main container to use full page size */
          main, .main-content, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          /* Print headers styling */
          .print-header {
            display: block !important;
            margin-bottom: 20px;
            font-family: monospace;
          }
          /* Custom report table grid rules */
          table {
            border: 1px solid #333333 !important;
            width: 100% !important;
            color: #000000 !important;
          }
          th {
            background: #eeeeee !important;
            color: #000000 !important;
            border-bottom: 2px solid #000000 !important;
          }
          td {
            border-bottom: 1px solid #dddddd !important;
          }
        }
        .print-header {
          display: none;
        }
      `}} />

      {/* Print Page Header */}
      <div className="print-header">
        <h2 style={{ fontFamily: "monospace", fontSize: "18px", margin: "0 0 4px 0" }}>ECOSPHERE ESG PLATFORM</h2>
        <div style={{ fontSize: "12px", color: "#666" }}>
          COMPILED REPORT SHEET — EXPORT DATE: {exportDate}
        </div>
        <div style={{ margin: "12px 0", borderBottom: "1px dashed #333" }} />
      </div>

      {/* Header */}
      <div className="no-print" style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          CUSTOM REPORT BUILDER
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Combine filter tags and build structured ESG logs, then export them in CSV, Excel or PDF formats.
        </p>
      </div>

      <div className="no-print" style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      {error && (
        <div className="msg msg-error no-print" style={{ marginBottom: "var(--space-4)" }}>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="msg msg-success no-print" style={{ marginBottom: "var(--space-4)" }}>
          <span>{success}</span>
        </div>
      )}

      {loadingMetadata ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <span className="spinner" />
          <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>
            RETRIEVING META CONFIGURATIONS...
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          
          {/* ── FILTER MATRIX FORM ── */}
          <form onSubmit={handleGenerate} className="card-elevated no-print">
            <div className="card-header">REPORT FILTER MATRIX</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
              {/* Module selection */}
              <div className="form-group">
                <label className="form-label">TARGET MODULE</label>
                <select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border-medium)",
                    color: "var(--color-primary)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    outline: "none",
                    borderRadius: "0px"
                  }}
                  disabled={generating}
                >
                  <option value="all">ALL MODULES (E, S, G)</option>
                  <option value="environmental">ENVIRONMENTAL (CARBON)</option>
                  <option value="social">SOCIAL (CSR ACTIVITIES)</option>
                  <option value="governance">GOVERNANCE (COMPLIANCE)</option>
                </select>
              </div>

              {/* Department selection */}
              <div className="form-group">
                <label className="form-label">DEPARTMENT</label>
                <select
                  value={filterDeptId}
                  onChange={(e) => setFilterDeptId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border-medium)",
                    color: "var(--color-primary)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    outline: "none",
                    borderRadius: "0px"
                  }}
                  disabled={generating}
                >
                  <option value="all">ALL DEPARTMENTS</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      &gt; {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee selection */}
              <div className="form-group">
                <label className="form-label">EMPLOYEE / OWNER</label>
                <select
                  value={filterEmployeeId}
                  onChange={(e) => setFilterEmployeeId(e.target.value)}
                  className="form-input"
                  disabled={generating}
                >
                  <option value="all">ALL USERS</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">CHALLENGE</label>
                <select
                  value={filterChallengeId}
                  onChange={(e) => setFilterChallengeId(e.target.value)}
                  className="form-input"
                  disabled={generating}
                >
                  <option value="all">ALL CHALLENGES</option>
                  {challenges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">ESG CATEGORY</label>
                <select
                  value={filterCategoryId}
                  onChange={(e) => setFilterCategoryId(e.target.value)}
                  className="form-input"
                  disabled={generating}
                >
                  <option value="all">ALL CATEGORIES</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start date */}
              <div className="form-group">
                <label className="form-label">START DATE</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ paddingLeft: "12px", height: "36px", fontSize: "13px" }}
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  disabled={generating}
                />
              </div>

              {/* End date */}
              <div className="form-group">
                <label className="form-label">END DATE</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ paddingLeft: "12px", height: "36px", fontSize: "13px" }}
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  disabled={generating}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="submit"
                disabled={generating}
                className={`btn btn-primary btn-md${generating ? " btn-loading" : ""}`}
                style={{ width: "200px" }}
              >
                {generating ? "COMPILING" : "COMPILE REPORT"}
              </button>

              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginLeft: "auto" }}>
                <span style={{ color: "var(--color-text-dim)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.05em" }}>EXPORT FORMAT:</span>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as "csv" | "excel" | "pdf")}
                  style={{
                    padding: "6px 12px",
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border-medium)",
                    color: "var(--color-primary)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    outline: "none",
                    borderRadius: "0px",
                    height: "36px"
                  }}
                  disabled={exporting}
                >
                  <option value="csv">CSV SPREADSHEET (.csv)</option>
                  <option value="excel">MICROSOFT EXCEL (.xls)</option>
                  <option value="pdf">PDF DOCUMENT (.pdf)</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (docType === "pdf") {
                      handlePrintPDF();
                    } else {
                      handleExport(docType);
                    }
                  }}
                  disabled={exporting || reportRows.length === 0}
                  className="btn btn-secondary btn-md"
                  style={{ height: "36px", display: "flex", alignItems: "center" }}
                  title={reportRows.length === 0 ? "Compile report first before exporting" : "Export compiled report data"}
                >
                  [⬇] EXPORT
                </button>
              </div>
            </div>
          </form>

          {/* ── REPORT OUTPUT TABLE ── */}
          {reportRows.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                <div className="card-header" style={{ marginBottom: 0 }}>COMPILED REPORT SHEET OUTPUT</div>
              </div>

              <div className="data-table-wrap">
                <table className="data-table" style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                  <thead>
                    <tr>
                      <SortableTh label="DATE" columnKey="date" sortKey={reportSortKey} sortDir={reportSortDir} onSort={reportToggle} />
                      <SortableTh label="MODULE" columnKey="module" sortKey={reportSortKey} sortDir={reportSortDir} onSort={reportToggle} />
                      <SortableTh label="DEPARTMENT" columnKey="department" sortKey={reportSortKey} sortDir={reportSortDir} onSort={reportToggle} />
                      <SortableTh label="EMPLOYEE / OWNER" columnKey="employee" sortKey={reportSortKey} sortDir={reportSortDir} onSort={reportToggle} />
                      <SortableTh label="METRIC / CSR ACTIVITY" columnKey="metric" sortKey={reportSortKey} sortDir={reportSortDir} onSort={reportToggle} />
                      <SortableTh label="RESULT VALUE" columnKey="value" sortKey={reportSortKey} sortDir={reportSortDir} onSort={reportToggle} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedReportRows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{r.date}</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <span className={`chip ${r.module === "Environmental" ? "chip-green" : r.module === "Social" ? "chip-cyan" : "chip-amber"}`}>
                            {r.module.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: r.department_name ? "var(--color-text-primary)" : "var(--color-text-dim)" }}>
                          {r.department_name ? `${r.department_name}` : "None"}
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)" }}>{r.employee_name || "–"}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)" }}>{r.metric_name}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-secondary)", fontWeight: "bold" }}>{r.metric_value}</td>
                      </tr>
                    ))}
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
