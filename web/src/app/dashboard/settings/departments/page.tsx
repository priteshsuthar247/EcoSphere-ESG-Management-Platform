"use client";
// src/app/dashboard/settings/departments/page.tsx
// Department Management interface for administrators - TerminalUI design system

import { useState, useEffect } from "react";

interface Department {
  id: number;
  name: string;
  code: string;
  head_user_id: number | null;
  head_user_name: string | null;
  parent_department_id: number | null;
  parent_department_name: string | null;
  employee_count: number;
  description: string | null;
  location: string | null;
  status: string;
}

interface UserDropdownEntry {
  id: number;
  name: string;
  email: string;
}

export default function DepartmentsManagementPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserDropdownEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit / Add form state
  const [isAdding, setIsAdding] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formHeadUserId, setFormHeadUserId] = useState<string>("null");
  const [formParentDeptId, setFormParentDeptId] = useState<string>("null");
  const [formLocation, setFormLocation] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [deptsRes, usersRes] = await Promise.all([
        fetch("/api/admin/departments"),
        fetch("/api/admin/users")
      ]);

      const deptsJson = await deptsRes.json();
      const usersJson = await usersRes.json();

      if (!deptsRes.ok || !deptsJson.success) {
        throw new Error(deptsJson.error || "Failed to load departments");
      }
      if (!usersRes.ok || !usersJson.success) {
        throw new Error(usersJson.error || "Failed to load users");
      }

      setDepartments(deptsJson.data);
      setUsers(usersJson.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleAddClick() {
    setIsAdding(true);
    setEditingDept(null);
    setFormName("");
    setFormCode("");
    setFormHeadUserId("null");
    setFormParentDeptId("null");
    setFormLocation("");
    setFormDescription("");
    setFormStatus("active");
    setError("");
    setSuccess("");
  }

  function handleEditClick(dept: Department) {
    setIsAdding(false);
    setEditingDept(dept);
    setFormName(dept.name);
    setFormCode(dept.code);
    setFormHeadUserId(dept.head_user_id === null ? "null" : String(dept.head_user_id));
    setFormParentDeptId(dept.parent_department_id === null ? "null" : String(dept.parent_department_id));
    setFormLocation(dept.location || "");
    setFormDescription(dept.description || "");
    setFormStatus(dept.status);
    setError("");
    setSuccess("");
  }

  function closePanel() {
    setIsAdding(false);
    setEditingDept(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const payload = {
      id: editingDept?.id,
      name: formName.trim(),
      code: formCode.trim(),
      headUserId: formHeadUserId === "null" ? null : parseInt(formHeadUserId, 10),
      parentDepartmentId: formParentDeptId === "null" ? null : parseInt(formParentDeptId, 10),
      location: formLocation.trim() || null,
      description: formDescription.trim() || null,
      status: formStatus
    };

    try {
      const url = "/api/admin/departments";
      const method = editingDept ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to commit department transaction");
      }

      setSuccess(editingDept ? "Department details updated." : "New department initialized.");
      setIsAdding(false);
      setEditingDept(null);
      fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          # ADMIN / SETTINGS / DEPARTMENTS
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          DEPARTMENT REGISTRY
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Configure organizational branches, designate operational heads, and set relative hierarchy.
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
            ACCESSING REGISTRY DATA...
          </span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: (isAdding || editingDept) ? "1fr 360px" : "1fr", gap: "var(--space-6)" }}>
          
          {/* ── LIST PANEL ── */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
              <div className="card-header" style={{ marginBottom: 0 }}>ACTIVE DIRECTORY FILE</div>
              {!isAdding && !editingDept && (
                <button onClick={handleAddClick} className="btn btn-primary btn-sm btn-cli">
                  NEW DEPARTMENT
                </button>
              )}
            </div>

            <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px dashed var(--color-border-medium)", background: "var(--color-surface)" }}>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>CODE</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>NAME</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>HEAD OF DEPT</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>PARENT DEPT</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>LOCATION</th>
                    <th style={{ textAlign: "right", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>EMP COUNT</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>STATUS</th>
                    <th style={{ textAlign: "center", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-dim)" }}>
                        // NO DEPARTMENTS DECLARED IN DATABASE SYSTEM
                      </td>
                    </tr>
                  ) : (
                    departments.map((d) => (
                      <tr 
                        key={d.id} 
                        style={{ 
                          borderBottom: "1px solid var(--color-border-subtle)", 
                          background: editingDept?.id === d.id ? "rgba(0, 255, 65, 0.04)" : "transparent"
                        }}
                      >
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-secondary)", fontWeight: 700 }}>{d.code}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)" }}>{d.name}</td>
                        <td style={{ padding: "10px var(--space-3)", color: d.head_user_name ? "var(--color-text-primary)" : "var(--color-text-dim)" }}>
                          {d.head_user_name ? `@ ${d.head_user_name}` : "// NONE"}
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: d.parent_department_name ? "var(--color-text-primary)" : "var(--color-text-dim)" }}>
                          {d.parent_department_name ? `^ ${d.parent_department_name}` : "// NONE"}
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{d.location || "–"}</td>
                        <td style={{ padding: "10px var(--space-3)", textAlign: "right", color: "var(--color-text-primary)" }}>{d.employee_count}</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <span className={`chip ${d.status === "active" ? "chip-green" : "chip-muted"}`}>
                            {d.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", textAlign: "center" }}>
                          <button 
                            onClick={() => handleEditClick(d)} 
                            className="btn btn-secondary btn-sm"
                          >
                            $ edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── CREATE / EDIT PANEL ── */}
          {(isAdding || editingDept) && (
            <div className="card-elevated" style={{ height: "fit-content" }}>
              <div className="card-header">
                {isAdding ? "INITIALIZE DEPARTMENT" : `CONFIGURE BRANCH: ${editingDept?.code}`}
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  
                  {/* Name field */}
                  <div className="form-group">
                    <label className="form-label">DEPARTMENT NAME</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. Sustainability"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Code field */}
                  <div className="form-group">
                    <label className="form-label">REGISTRY CODE</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. SUST"
                        value={formCode}
                        onChange={(e) => setFormCode(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Location field */}
                  <div className="form-group">
                    <label className="form-label">PHYSICAL LOCATION</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. Floor 4, Suite B"
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Head of Department */}
                  <div className="form-group">
                    <label className="form-label">DESIGNATED MANAGER</label>
                    <div>
                      <select 
                        value={formHeadUserId}
                        onChange={(e) => setFormHeadUserId(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          background: "var(--color-bg)",
                          border: "1px solid var(--color-border-medium)",
                          color: "var(--color-primary)",
                          fontFamily: "var(--font-mono)",
                          fontSize: "14px",
                          outline: "none",
                          borderRadius: "0px"
                        }}
                        disabled={submitting}
                      >
                        <option value="null">// NO MANAGER ASSIGNED</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            @ {u.name} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Parent Department */}
                  <div className="form-group">
                    <label className="form-label">PARENT BRANCH</label>
                    <div>
                      <select 
                        value={formParentDeptId}
                        onChange={(e) => setFormParentDeptId(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          background: "var(--color-bg)",
                          border: "1px solid var(--color-border-medium)",
                          color: "var(--color-primary)",
                          fontFamily: "var(--font-mono)",
                          fontSize: "14px",
                          outline: "none",
                          borderRadius: "0px"
                        }}
                        disabled={submitting}
                      >
                        <option value="null">// NO PARENT HIERARCHY</option>
                        {departments
                          .filter((d) => d.id !== editingDept?.id) // Prevent self-referencing hierarchy
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              ^ {d.name} ({d.code})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Description field */}
                  <div className="form-group">
                    <label className="form-label">DESCRIPTION COMMENTS</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. ESG Compliance audits & monitoring"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Status selection */}
                  <div className="form-group">
                    <label className="form-label">OPERATIONAL STATUS</label>
                    <div>
                      <select 
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          background: "var(--color-bg)",
                          border: "1px solid var(--color-border-medium)",
                          color: "var(--color-primary)",
                          fontFamily: "var(--font-mono)",
                          fontSize: "14px",
                          outline: "none",
                          borderRadius: "0px"
                        }}
                        disabled={submitting}
                      >
                        <option value="active">ACTIVE</option>
                        <option value="inactive">INACTIVE</option>
                        <option value="draft">DRAFT</option>
                        <option value="archived">ARCHIVED</option>
                      </select>
                    </div>
                  </div>

                  <div 
                    className="ascii-divider" 
                    style={{ color: "var(--color-border-subtle)", margin: "var(--space-2) 0" }}
                  >
                    {"─".repeat(24)}
                  </div>

                  {/* Buttons */}
                  <div style={{ display: "flex", gap: "var(--space-3)" }}>
                    <button 
                      type="submit" 
                      disabled={submitting || !formName || !formCode}
                      className={`btn btn-primary btn-md btn-cli btn-full${submitting ? " btn-loading" : ""}`}
                    >
                      {submitting ? "COMMITTING" : "COMMIT"}
                    </button>
                    <button 
                      type="button" 
                      onClick={closePanel}
                      className="btn btn-ghost btn-md btn-full"
                      disabled={submitting}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
