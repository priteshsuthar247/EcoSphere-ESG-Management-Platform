"use client";
// Training completion tracker

import { useCallback, useEffect, useMemo, useState } from "react";
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

interface Training {
  id: number;
  user_id: number;
  user_name: string;
  department_name: string | null;
  training_name: string;
  category: string | null;
  completion_date: string;
  hours: number | null;
  certificate_url: string | null;
}

export default function TrainingPage() {
  const [items, setItems] = useState<Training[]>([]);
  const [stats, setStats] = useState({ total: 0, employees_trained: 0, total_hours: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { draft, setSearch, setStatus, apply, queryString } = useListQuery();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    training_name: "",
    category: "ESG",
    completion_date: new Date().toISOString().slice(0, 10),
    hours: "",
    certificate_url: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/social/training${queryString ? `?${queryString}` : ""}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load training");
      setItems(json.data.items);
      setStats(json.data.stats);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/social/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          training_name: form.training_name,
          category: form.category || null,
          completion_date: form.completion_date,
          hours: form.hours === "" ? null : Number(form.hours),
          certificate_url: form.certificate_url || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Save failed");
      setSuccess("Training completion recorded.");
      setShowForm(false);
      setForm({
        training_name: "",
        category: "ESG",
        completion_date: new Date().toISOString().slice(0, 10),
        hours: "",
        certificate_url: "",
      });
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const getTrainSort = useCallback((row: Training, key: string): unknown => {
    switch (key) {
      case "id": return row.id;
      case "employee": return row.user_name;
      case "dept": return row.department_name ?? "";
      case "name": return row.training_name;
      case "category": return row.category ?? "";
      case "date": return row.completion_date ?? "";
      case "hours": return row.hours ?? 0;
      default: return null;
    }
  }, []);

  const { sorted, sortKey, sortDir, toggle } = useTableSort(items, getTrainSort, "date", "desc");

  return (
    <div>
      <div className="page-header">
        <h1>Training completion</h1>
        <p>
          Track ESG and compliance training hours and certificates for the workforce.
        </p>
      </div>

      <div className="stats-grid" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card">
          <div style={{ fontSize: 12, color: "var(--color-text-dim)" }}>Records</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--color-primary)" }}>{stats.total}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 12, color: "var(--color-text-dim)" }}>People trained</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--color-tertiary)" }}>
            {stats.employees_trained}
          </div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 12, color: "var(--color-text-dim)" }}>Total hours</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--color-secondary)" }}>
            {Number(stats.total_hours).toFixed(1)}
          </div>
        </div>
      </div>

      {error && <AlertBanner type="error">{error}</AlertBanner>}
      {success && <AlertBanner type="success">{success}</AlertBanner>}

      <TableFilters
        search={draft.search}
        onSearchChange={setSearch}
        searchPlaceholder="Search training, employee…"
            
      onApply={apply}

      applying={loading}

      />
          <ToolbarActions>
            <button type="button" className="btn btn-primary btn-md" onClick={() => setShowForm(true)}>
            Log training
          </button>
          </ToolbarActions>
      <div className="card-header">Training registry</div>
      {loading ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <span className="spinner" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-muted)" }}>
          No training records yet.
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <SortableTh label="ID" columnKey="id" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                <SortableTh label="Employee" columnKey="employee" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                <SortableTh label="Department" columnKey="department" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                <SortableTh label="Training" columnKey="training" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                <SortableTh label="Category" columnKey="category" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                <SortableTh label="Date" columnKey="date" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                <SortableTh label="Hours" columnKey="hours" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                <th className="sortable-th" style={{ cursor: "default" }}>Certificate</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.id}>
                  <td style={{ color: "var(--color-text-dim)" }}>
                    {String(t.id).padStart(3, "0")}
                  </td>
                  <td>{t.user_name}</td>
                  <td style={{ color: "var(--color-text-muted)" }}>
                    {t.department_name || "—"}
                  </td>
                  <td style={{ fontWeight: 500 }}>{t.training_name}</td>
                  <td>{t.category || "—"}</td>
                  <td>{String(t.completion_date).slice(0, 10)}</td>
                  <td>{t.hours ?? "—"}</td>
                  <td>
                    {t.certificate_url ? (
                      <a href={t.certificate_url} target="_blank" rel="noreferrer">
                        Link
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showForm}
        title="Log training completion"
        onClose={() => {
          if (!submitting) setShowForm(false);
        }}
        width={520}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="form-group">
              <label className="form-label required">Training name</label>
              <input
                className="form-input"
                value={form.training_name}
                onChange={(e) => setForm({ ...form, training_name: e.target.value })}
                required
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <input
                className="form-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                disabled={submitting}
                placeholder="ESG, Safety, Compliance…"
              />
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label required">Completion date</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.completion_date}
                  onChange={(e) => setForm({ ...form, completion_date: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="form-input"
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Certificate URL</label>
              <input
                className="form-input"
                value={form.certificate_url}
                onChange={(e) => setForm({ ...form, certificate_url: e.target.value })}
                placeholder="https://…"
                disabled={submitting}
              />
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button type="submit" className="btn btn-primary btn-md btn-full" disabled={submitting}>
                {submitting ? "Saving…" : "Save training"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-md btn-full"
                onClick={() => setShowForm(false)}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
