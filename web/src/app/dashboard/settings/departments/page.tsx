"use client";
// src/app/dashboard/settings/departments/page.tsx
// Department Management interface for administrators - TerminalUI design system

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/Modal";
import TableFilters, { matchesSearch, matchesStatus } from "@/components/TableFilters";
import { useTableSort } from "@/components/useTableSort";
import SortableTh from "@/components/SortableTh";

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

  const [isAdding, setIsAdding] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const filtered = departments.filter(
    (d) =>
      matchesStatus(statusFilter, d.status) &&
      matchesSearch(search, [d.id, d.name, d.code, d.head_user_name, d.parent_department_name, d.location]),
  );

  const getSortValue = useCallback((row: Department, key: string): unknown => {
    switch (key) {
      case "code": return row.code;
      case "name": return row.name;
      case "head": return row.head_user_name ?? "";
      case "parent": return row.parent_department_name ?? "";
      case "location": return row.location ?? "";
      case "employees": return row.employee_count;
      case "status": return row.status;
      default: return null;
    }
  }, []);

  const { sorted, sortKey, sortDir, toggle } = useTableSort(filtered, getSortValue, "name");
  const formOpen = isAdding || editingDept !== null;

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
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
          <span style={{ marginLeft: "var(--space-3)" }}>Loading departments…</span>
        </div>
      ) : (
        <>
          <TableFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search departments, code, head…"
            status={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "draft", label: "Draft" },
              { value: "archived", label: "Archived" },
            ]}
            extra={
              <button type="button" onClick={handleAddClick} className="btn btn-primary btn-md">
                New department
              </button>
            }
          />

          <div>
            <div className="card-header">Active directory</div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableTh label="Code" columnKey="code" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Name" columnKey="name" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Head" columnKey="head" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Parent" columnKey="parent" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Location" columnKey="location" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Employees" columnKey="employees" sortKey={sortKey} sortDir={sortDir} onSort={toggle} align="right" />
                    <SortableTh label="Status" columnKey="status" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <th className="sortable-th" style={{ textAlign: "center", cursor: "default" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-dim)" }}>
                        No departments found.
                      </td>
                    </tr>
                  ) : (
                    sorted.map((d) => (
                      <tr key={d.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-secondary)", fontWeight: 700 }}>{d.code}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)" }}>{d.name}</td>
                        <td style={{ padding: "10px var(--space-3)", color: d.head_user_name ? "var(--color-text-primary)" : "var(--color-text-dim)" }}>
                          {d.head_user_name || "—"}
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: d.parent_department_name ? "var(--color-text-primary)" : "var(--color-text-dim)" }}>
                          {d.parent_department_name || "—"}
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{d.location || "–"}</td>
                        <td style={{ padding: "10px var(--space-3)", textAlign: "right", color: "var(--color-text-primary)" }}>{d.employee_count}</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <span className={`chip ${d.status === "active" ? "chip-green" : "chip-muted"}`}>{d.status}</span>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", textAlign: "center" }}>
                          <button type="button" onClick={() => handleEditClick(d)} className="btn btn-secondary btn-sm">Edit</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Modal
            open={formOpen}
            title={isAdding ? "New department" : `Edit department: ${editingDept?.code ?? ""}`}
            onClose={() => { if (!submitting) closePanel(); }}
            width={560}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div className="form-group">
                  <label className="form-label required">Department name</label>
                  <input type="text" className="form-input" placeholder="e.g. Sustainability" value={formName} onChange={(e) => setFormName(e.target.value)} required disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label required">Registry code</label>
                  <input type="text" className="form-input" placeholder="e.g. SUST" value={formCode} onChange={(e) => setFormCode(e.target.value)} required disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label">Physical location</label>
                  <input type="text" className="form-input" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label">Designated manager</label>
                  <select className="form-input" value={formHeadUserId} onChange={(e) => setFormHeadUserId(e.target.value)} disabled={submitting}>
                    <option value="null">No manager assigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Parent branch</label>
                  <select className="form-input" value={formParentDeptId} onChange={(e) => setFormParentDeptId(e.target.value)} disabled={submitting}>
                    <option value="null">No parent hierarchy</option>
                    {departments
                      .filter((d) => d.id !== editingDept?.id)
                      .map((d) => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input type="text" className="form-input" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label">Operational status</label>
                  <select className="form-input" value={formStatus} onChange={(e) => setFormStatus(e.target.value)} disabled={submitting}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <button type="submit" disabled={submitting || !formName || !formCode} className={`btn btn-primary btn-md btn-full${submitting ? " btn-loading" : ""}`}>
                    {submitting ? "Saving…" : editingDept ? "Save changes" : "Create department"}
                  </button>
                  <button type="button" onClick={closePanel} className="btn btn-ghost btn-md btn-full" disabled={submitting}>
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
