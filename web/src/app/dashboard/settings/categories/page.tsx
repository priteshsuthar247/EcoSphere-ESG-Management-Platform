"use client";
// src/app/dashboard/settings/categories/page.tsx
// Categories Management interface for administrators - TerminalUI design system

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import TableFilters, { matchesSearch, matchesStatus } from "@/components/TableFilters";

interface Category {
  id: number;
  name: string;
  type: string;
  description: string | null;
  status: string;
  created_at: string;
}

export default function CategoriesManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isAdding, setIsAdding] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("csr_activity");
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
      const res = await fetch("/api/admin/categories");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load categories");
      }

      setCategories(json.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleAddClick() {
    setIsAdding(true);
    setEditingCategory(null);
    setFormName("");
    setFormType("csr_activity");
    setFormDescription("");
    setFormStatus("active");
    setError("");
    setSuccess("");
  }

  function handleEditClick(category: Category) {
    setIsAdding(false);
    setEditingCategory(category);
    setFormName(category.name);
    setFormType(category.type);
    setFormDescription(category.description || "");
    setFormStatus(category.status);
    setError("");
    setSuccess("");
  }

  function closePanel() {
    setIsAdding(false);
    setEditingCategory(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const payload = {
      id: editingCategory?.id,
      name: formName.trim(),
      type: formType,
      description: formDescription.trim() || null,
      status: formStatus
    };

    try {
      const url = "/api/admin/categories";
      const method = editingCategory ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to commit category transaction");
      }

      setSuccess(editingCategory ? "Category details updated." : "New category initialized.");
      setIsAdding(false);
      setEditingCategory(null);
      fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const typeLabels: Record<string, string> = {
    csr_activity: "CSR ACTIVITY",
    challenge: "CHALLENGE",
    esg_category: "ESG METRIC CATEGORY",
  };

  const typeChips: Record<string, string> = {
    csr_activity: "chip-cyan",
    challenge: "chip-amber",
    esg_category: "chip-green",
  };

  const filtered = categories.filter(
    (c) =>
      matchesStatus(statusFilter, c.status) &&
      matchesSearch(search, [c.id, c.name, c.type, c.description, typeLabels[c.type]]),
  );
  const formOpen = isAdding || editingCategory !== null;

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          CLASSIFICATION REGISTRY
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Define operational categories for CSR initiatives, gamification challenges, and ESG metrics.
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
          <span style={{ marginLeft: "var(--space-3)" }}>Loading categories…</span>
        </div>
      ) : (
        <>
          <TableFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search categories…"
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
                New category
              </button>
            }
          />

          <div>
            <div className="card-header">Categories master register</div>
            <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)", borderRadius: "var(--radius-lg)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border-medium)", background: "var(--color-surface)" }}>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>ID</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Name</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Module type</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Description</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Status</th>
                    <th style={{ textAlign: "center", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-dim)" }}>
                        No categories found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <tr key={c.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{String(c.id).padStart(3, "0")}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)", fontWeight: 500 }}>{c.name}</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <span className={`chip ${typeChips[c.type] ?? "chip-muted"}`}>
                            {typeLabels[c.type] ?? c.type}
                          </span>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{c.description || "–"}</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <span className={`chip ${c.status === "active" ? "chip-green" : "chip-muted"}`}>{c.status}</span>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", textAlign: "center" }}>
                          <button type="button" onClick={() => handleEditClick(c)} className="btn btn-secondary btn-sm">Edit</button>
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
            title={isAdding ? "New category" : `Edit category #${editingCategory?.id ?? ""}`}
            onClose={() => { if (!submitting) closePanel(); }}
            width={520}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div className="form-group">
                  <label className="form-label required">Category name</label>
                  <input type="text" className="form-input" placeholder="e.g. Energy Management" value={formName} onChange={(e) => setFormName(e.target.value)} required disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label">Module relation type</label>
                  <select className="form-input" value={formType} onChange={(e) => setFormType(e.target.value)} disabled={submitting}>
                    <option value="csr_activity">CSR activity</option>
                    <option value="challenge">Gamification challenge</option>
                    <option value="esg_category">ESG score category</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input type="text" className="form-input" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label">Registry status</label>
                  <select className="form-input" value={formStatus} onChange={(e) => setFormStatus(e.target.value)} disabled={submitting}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <button type="submit" disabled={submitting || !formName} className={`btn btn-primary btn-md btn-full${submitting ? " btn-loading" : ""}`}>
                    {submitting ? "Saving…" : editingCategory ? "Save changes" : "Create category"}
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
