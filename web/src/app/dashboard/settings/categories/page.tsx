"use client";
// src/app/dashboard/settings/categories/page.tsx
// Categories Management interface for administrators - TerminalUI design system

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/Modal";
import TableFilters from "@/components/TableFilters";
import { useListQuery } from "@/components/useListQuery";
import PageHeader from "@/components/ui/PageHeader";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import ToolbarActions from "@/components/ui/ToolbarActions";
import SectionTitle from "@/components/ui/SectionTitle";
import StatusChip from "@/components/ui/StatusChip";
import {
  DataTableWrap,
  DataTable,
  DataTableEmptyRow,
  ActionTh,
} from "@/components/ui/DataTable";
import { useTableSort } from "@/components/useTableSort";
import SortableTh from "@/components/SortableTh";

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
  const { draft, setSearch, setStatus, apply, queryString } = useListQuery();

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("csr_activity");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/categories${queryString ? `?${queryString}` : ""}`);
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
  }, [queryString]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

    const getSortValue = useCallback((row: Category, key: string): unknown => {
    switch (key) {
      case "id": return row.id;
      case "name": return row.name;
      case "type": return typeLabels[row.type] ?? row.type;
      case "description": return row.description ?? "";
      case "status": return row.status;
      default: return null;
    }
  }, []);

  const { sorted, sortKey, sortDir, toggle } = useTableSort(categories, getSortValue, "id");
  const formOpen = isAdding || editingCategory !== null;

  return (
    <div>
      <PageHeader
        title="Classification registry"
        description="Define operational categories for CSR initiatives, gamification challenges, and ESG metrics."
      />

      {error && <AlertBanner type="error">{error}</AlertBanner>}
      {success && <AlertBanner type="success">{success}</AlertBanner>}

      {loading ? (
        <LoadingState label="Loading categories…" />
      ) : (
        <>
          <TableFilters
            search={draft.search}
            onSearchChange={setSearch}
            searchPlaceholder="Search categories…"
            status={draft.status}
            onStatusChange={setStatus}
            statusOptions={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "draft", label: "Draft" },
              { value: "archived", label: "Archived" },
            ]}
            onApply={apply}
            applying={loading}
          />
          <ToolbarActions>
            <button type="button" onClick={handleAddClick} className="btn btn-primary btn-md">
              New category
            </button>
          </ToolbarActions>
          <div>
            <SectionTitle>Categories master register</SectionTitle>
            <DataTableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <SortableTh label="ID" columnKey="id" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Name" columnKey="name" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Module type" columnKey="type" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Description" columnKey="description" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Status" columnKey="status" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <ActionTh />
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <DataTableEmptyRow colSpan={6} message="No categories found." />
                  ) : (
                    sorted.map((c) => (
                      <tr key={c.id}>
                        <td className="col-id">{String(c.id).padStart(3, "0")}</td>
                        <td style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{c.name}</td>
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
              </DataTable>
            </DataTableWrap>
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
