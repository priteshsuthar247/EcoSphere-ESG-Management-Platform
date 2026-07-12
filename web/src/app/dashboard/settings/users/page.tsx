"use client";
// src/app/dashboard/settings/users/page.tsx
// User Management interface for administrators - TerminalUI design system

import { useState, useEffect } from "react";

interface UserListEntry {
  id: number;
  name: string;
  email: string;
  role: string;
  department_id: number | null;
  department_name: string | null;
  status: string;
  esg_points_balance: number;
  total_xp: number;
  joined_at: string;
  last_login_at: string | null;
}

interface Department {
  id: number;
  name: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserListEntry[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit form state
  const [editingUser, setEditingUser] = useState<UserListEntry | null>(null);
  const [editRole, setEditRole] = useState("employee");
  const [editDeptId, setEditDeptId] = useState<string>("null");
  const [editStatus, setEditStatus] = useState("active");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [usersRes, deptsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/departments")
      ]);

      const usersJson = await usersRes.json();
      const deptsJson = await deptsRes.json();

      if (!usersRes.ok || !usersJson.success) {
        throw new Error(usersJson.error || "Failed to load users");
      }
      if (!deptsRes.ok || !deptsJson.success) {
        throw new Error(deptsJson.error || "Failed to load departments");
      }

      setUsers(usersJson.data);
      setDepartments(deptsJson.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleEditClick(user: UserListEntry) {
    setEditingUser(user);
    setEditRole(user.role);
    setEditDeptId(user.department_id === null ? "null" : String(user.department_id));
    setEditStatus(user.status);
    setError("");
    setSuccess("");
  }

  async function handleUpdateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    setUpdating(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          role: editRole,
          departmentId: editDeptId === "null" ? null : parseInt(editDeptId, 10),
          status: editStatus
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update user");
      }

      setSuccess("User updated successfully.");
      setEditingUser(null);
      fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUpdating(false);
    }
  }

  const roleLabels: Record<string, string> = {
    admin: "ADMIN",
    ceo: "CEO",
    departmental_head: "DEPT HEAD",
    employee: "EMPLOYEE",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          # ADMIN / SETTINGS / USER-MANAGEMENT
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          USER ACCESS CONTROL
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Manage directory access, update roles, assign departments, and configure system permissions.
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
            RETRIEVING ACCESS CONTROL LISTINGS...
          </span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: editingUser ? "1fr 340px" : "1fr", gap: "var(--space-6)" }}>
          {/* ── USER DIRECTORY LISTING ── */}
          <div>
            <div className="card-header">USER DIRECTORY FILE</div>
            
            <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px dashed var(--color-border-medium)", background: "var(--color-surface)" }}>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>ID</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>NAME</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>EMAIL</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>ROLE</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>DEPARTMENT</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>STATUS</th>
                    <th style={{ textAlign: "right", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>XP / PTS</th>
                    <th style={{ textAlign: "center", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr 
                      key={u.id} 
                      style={{ 
                        borderBottom: "1px solid var(--color-border-subtle)", 
                        background: editingUser?.id === u.id ? "rgba(0, 255, 65, 0.04)" : "transparent"
                      }}
                    >
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{String(u.id).padStart(3, "0")}</td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)", fontWeight: 500 }}>{u.name}</td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{u.email}</td>
                      <td style={{ padding: "10px var(--space-3)" }}>
                        <span className={`chip ${u.role === "admin" ? "chip-red" : u.role === "ceo" ? "chip-amber" : u.role === "departmental_head" ? "chip-cyan" : "chip-muted"}`}>
                          {roleLabels[u.role] ?? u.role}
                        </span>
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: u.department_name ? "var(--color-text-primary)" : "var(--color-text-dim)" }}>
                        {u.department_name ? `> ${u.department_name}` : "// NONE"}
                      </td>
                      <td style={{ padding: "10px var(--space-3)" }}>
                        <span className={`chip ${u.status === "active" ? "chip-green" : "chip-muted"}`}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px var(--space-3)", textAlign: "right", color: "var(--color-text-primary)" }}>
                        {u.total_xp} / {u.esg_points_balance}
                      </td>
                      <td style={{ padding: "10px var(--space-3)", textAlign: "center" }}>
                        <button 
                          onClick={() => handleEditClick(u)} 
                          className="btn btn-secondary btn-sm"
                        >
                          $ edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── ACCESS CONFIGURATION PANEL (EDIT DRAWER) ── */}
          {editingUser && (
            <div className="card-elevated" style={{ height: "fit-content" }}>
              <div className="card-header">CONFIGURE ACCESS: {editingUser.name}</div>
              
              <form onSubmit={handleUpdateSubmit}>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  
                  {/* Role config */}
                  <div className="form-group">
                    <label className="form-label">ASSIGNED ROLE</label>
                    <div style={{ position: "relative" }}>
                      <select 
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
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
                      >
                        <option value="admin">ADMIN</option>
                        <option value="ceo">CEO</option>
                        <option value="departmental_head">DEPT HEAD</option>
                        <option value="employee">EMPLOYEE</option>
                      </select>
                    </div>
                  </div>

                  {/* Department config */}
                  <div className="form-group">
                    <label className="form-label">DEPARTMENT ASSOCIATION</label>
                    <div>
                      <select 
                        value={editDeptId}
                        onChange={(e) => setEditDeptId(e.target.value)}
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
                      >
                        <option value="null">{"// NO DEPARTMENT ASSIGNED"}</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            &gt; {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Status config */}
                  <div className="form-group">
                    <label className="form-label">ACCOUNT STATUS</label>
                    <div>
                      <select 
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
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
                      >
                        <option value="active">ACTIVE</option>
                        <option value="inactive">INACTIVE</option>
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

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: "var(--space-3)" }}>
                    <button 
                      type="submit" 
                      disabled={updating}
                      className={`btn btn-primary btn-md btn-cli btn-full${updating ? " btn-loading" : ""}`}
                    >
                      {updating ? "UPDATING" : "COMMIT"}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setEditingUser(null)}
                      className="btn btn-ghost btn-md btn-full"
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
