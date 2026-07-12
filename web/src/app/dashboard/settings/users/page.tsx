"use client";
// src/app/dashboard/settings/users/page.tsx
// User Management — server-side list filters + shared UI

import { useState, useEffect, useCallback } from "react";
import { useSessionRole } from "@/components/useSessionRole";
import Modal from "@/components/Modal";
import TableFilters from "@/components/TableFilters";
import { useListQuery } from "@/components/useListQuery";
import { useTableSort } from "@/components/useTableSort";
import SortableTh from "@/components/SortableTh";
import PageHeader from "@/components/ui/PageHeader";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import SectionTitle from "@/components/ui/SectionTitle";
import StatusChip from "@/components/ui/StatusChip";
import {
  DataTableWrap,
  DataTable,
  DataTableEmptyRow,
  ActionTh,
} from "@/components/ui/DataTable";

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

  const { draft, setSearch, setStatus, setExtra, apply, queryString } = useListQuery({
    extras: { role: "all" },
  });

  const [editingUser, setEditingUser] = useState<UserListEntry | null>(null);
  const [editRole, setEditRole] = useState("employee");
  const [editDeptId, setEditDeptId] = useState<string>("null");
  const [editStatus, setEditStatus] = useState("active");
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = queryString ? `?${queryString}` : "";
      const [usersRes, deptsRes] = await Promise.all([
        fetch(`/api/admin/users${qs}`),
        fetch("/api/admin/departments?dropdown=true"),
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
  }, [queryString]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          status: editStatus,
        }),
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

  const getUserSortValue = useCallback((u: UserListEntry, key: string) => {
    switch (key) {
      case "id":
        return u.id;
      case "name":
        return u.name;
      case "email":
        return u.email;
      case "role":
        return u.role;
      case "department":
        return u.department_name ?? "";
      case "status":
        return u.status;
      case "xp":
        return u.total_xp;
      default:
        return "";
    }
  }, []);

  const { sorted: sortedUsers, sortKey, sortDir, toggle } = useTableSort(
    users,
    getUserSortValue,
    "id",
  );

  return (
    <div>
      <PageHeader
        title="User access control"
        description="Manage directory access, update roles, assign departments, and configure system permissions."
      />

      {error && <AlertBanner type="error">{error}</AlertBanner>}
      {success && <AlertBanner type="success">{success}</AlertBanner>}

      {loading ? (
        <LoadingState label="Loading users…" />
      ) : (
        <>
          <TableFilters
            search={draft.search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name or email…"
            status={draft.status}
            onStatusChange={setStatus}
            statusOptions={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "archived", label: "Archived" },
            ]}
            extraFields={
              <div className="table-filter-field">
                <label className="form-label">Role</label>
                <select
                  className="form-input"
                  value={draft.extras?.role ?? "all"}
                  onChange={(e) => setExtra("role", e.target.value)}
                >
                  <option value="all">All roles</option>
                  {!isCeo && <option value="admin">Admin</option>}
                  <option value="ceo">CEO</option>
                  <option value="departmental_head">Dept head</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
            }
            onApply={apply}
            applying={loading}
          />

          <SectionTitle>User directory</SectionTitle>
          <DataTableWrap>
            <DataTable>
              <thead>
                <tr>
                  <SortableTh label="ID" columnKey="id" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Name" columnKey="name" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Email" columnKey="email" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Role" columnKey="role" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Department" columnKey="department" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Status" columnKey="status" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="XP / Pts" columnKey="xp" sortKey={sortKey} sortDir={sortDir} onSort={toggle} align="right" />
                  <ActionTh />
                </tr>
              </thead>
              <tbody>
                {sortedUsers.length === 0 ? (
                  <DataTableEmptyRow colSpan={8} message="No users found." />
                ) : (
                  sortedUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="col-id">{String(u.id).padStart(3, "0")}</td>
                      <td style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{u.name}</td>
                      <td style={{ color: "var(--color-text-muted)" }}>{u.email}</td>
                      <td>
                        <span
                          className={`chip ${
                            u.role === "admin"
                              ? "chip-red"
                              : u.role === "ceo"
                                ? "chip-amber"
                                : u.role === "departmental_head"
                                  ? "chip-cyan"
                                  : "chip-muted"
                          }`}
                        >
                          {roleLabels[u.role] ?? u.role}
                        </span>
                      </td>
                      <td
                        style={{
                          color: u.department_name
                            ? "var(--color-text-primary)"
                            : "var(--color-text-dim)",
                        }}
                      >
                        {u.department_name || "—"}
                      </td>
                      <td>
                        <StatusChip status={u.status} />
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
                  ))
                )}
              </tbody>
            </DataTable>
          </DataTableWrap>

          <Modal
            open={Boolean(editingUser)}
            title={editingUser ? `Configure access: ${editingUser.name}` : "Configure access"}
            onClose={() => setEditingUser(null)}
            width={480}
          >
            <form onSubmit={handleUpdateSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div className="form-group">
                  <label className="form-label required">Assigned role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="form-input"
                  >
                    {!isCeo && <option value="admin">Admin</option>}
                    <option value="ceo">CEO</option>
                    <option value="departmental_head">Dept head</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Department association</label>
                  <select
                    value={editDeptId}
                    onChange={(e) => setEditDeptId(e.target.value)}
                    className="form-input"
                  >
                    <option value="null">No department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Account status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="form-input"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

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
