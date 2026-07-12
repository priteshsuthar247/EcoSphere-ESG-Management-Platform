"use client";
// src/app/dashboard/settings/users/page.tsx
// User Management interface for administrators

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSessionRole } from "@/components/useSessionRole";
import Modal from "@/components/Modal";
import TableFilters, { matchesSearch, matchesStatus } from "@/components/TableFilters";
import { useTableSort } from "@/components/useTableSort";
import SortableTh from "@/components/SortableTh";

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
  const { role: sessionRole } = useSessionRole();
  const isCeo = sessionRole === "ceo";
  const [users, setUsers] = useState<UserListEntry[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

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

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          matchesStatus(statusFilter, u.status) &&
          (roleFilter === "all" || u.role === roleFilter) &&
          matchesSearch(search, [u.id, u.name, u.email, u.department_name, u.role]),
      ),
    [users, statusFilter, roleFilter, search],
  );

  const getUserSortValue = useCallback((u: UserListEntry, key: string) => {
    switch (key) {
      case "id": return u.id;
      case "name": return u.name;
      case "email": return u.email;
      case "role": return u.role;
      case "department": return u.department_name ?? "";
      case "status": return u.status;
      case "xp": return u.total_xp;
      default: return "";
    }
  }, []);

  const { sorted: sortedUsers, sortKey, sortDir, toggle } = useTableSort(
    filteredUsers,
    getUserSortValue,
    "id",
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
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
          <span style={{ marginLeft: "var(--space-3)" }}>
            Loading users…
          </span>
        </div>
      ) : (
        <>
        <div>
          <TableFilters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search name or email…"
          status={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "archived", label: "Archived" },
          ]}
          extra={
            <div className="table-filter-field">
              <label className="form-label">Role</label>
              <select className="form-input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="all">All roles</option>
                {!isCeo && <option value="admin">Admin</option>}
                <option value="ceo">CEO</option>
                <option value="departmental_head">Dept head</option>
                <option value="employee">Employee</option>
              </select>
            </div>
          }
        />
        <div className="card-header">User directory</div>
            
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableTh label="ID" columnKey="id" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Name" columnKey="name" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Email" columnKey="email" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Role" columnKey="role" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Department" columnKey="department" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Status" columnKey="status" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="XP / Pts" columnKey="xp" sortKey={sortKey} sortDir={sortDir} onSort={toggle} align="right" />
                    <th className="sortable-th" style={{ textAlign: "center", cursor: "default" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((u) => (
                    <tr key={u.id}>
                      <td style={{ color: "var(--color-text-dim)" }}>{String(u.id).padStart(3, "0")}</td>
                      <td style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{u.name}</td>
                      <td style={{ color: "var(--color-text-muted)" }}>{u.email}</td>
                      <td>
                        <span className={`chip ${u.role === "admin" ? "chip-red" : u.role === "ceo" ? "chip-amber" : u.role === "departmental_head" ? "chip-cyan" : "chip-muted"}`}>
                          {roleLabels[u.role] ?? u.role}
                        </span>
                      </td>
                      <td style={{ color: u.department_name ? "var(--color-text-primary)" : "var(--color-text-dim)" }}>
                        {u.department_name || "—"}
                      </td>
                      <td>
                        <span className={`chip ${u.status === "active" ? "chip-green" : "chip-muted"}`}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", color: "var(--color-text-primary)" }}>
                        {u.total_xp} / {u.esg_points_balance}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button 
                          onClick={() => handleEditClick(u)} 
                          className="btn btn-secondary btn-sm"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Modal
            open={Boolean(editingUser)}
            title={editingUser ? `Configure access: ${editingUser.name}` : "Configure access"}
            onClose={() => setEditingUser(null)}
            width={480}
          >
              <form onSubmit={handleUpdateSubmit}>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  
                  {/* Role config */}
                  <div className="form-group">
                    <label className="form-label required">Assigned role</label>
                    <div style={{ position: "relative" }}>
                      <select 
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="form-input"
                      >
                        {/* CEO must not assign or see admin role */}
                        {!isCeo && <option value="admin">Admin</option>}
                        <option value="ceo">CEO</option>
                        <option value="departmental_head">Dept head</option>
                        <option value="employee">Employee</option>
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
                        <option value="null">"No department"</option>
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

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: "var(--space-3)" }}>
                    <button 
                      type="submit" 
                      disabled={updating}
                      className={`btn btn-primary btn-md btn-full${updating ? " btn-loading" : ""}`}
                    >
                      {updating ? "Saving…" : "Save changes"}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setEditingUser(null)}
                      className="btn btn-ghost btn-md btn-full"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
          </Modal>
        </>
      )}
    </div>
  );
}
