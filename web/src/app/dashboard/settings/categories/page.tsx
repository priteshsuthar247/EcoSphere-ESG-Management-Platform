"use client";
// src/app/dashboard/settings/categories/page.tsx
// Categories Management interface for administrators - TerminalUI design system

import { useState, useEffect } from "react";

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

  // Edit / Add form state
  const [isAdding, setIsAdding] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

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

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          # ADMIN / SETTINGS / CATEGORIES
        </div>
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
            RETRIEVING CATEGORIES INDEX...
          </span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: (isAdding || editingCategory) ? "1fr 360px" : "1fr", gap: "var(--space-6)" }}>
          
          {/* ── LIST PANEL ── */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
              <div className="card-header" style={{ marginBottom: 0 }}>CATEGORIES MASTER REGISTER</div>
              {!isAdding && !editingCategory && (
                <button onClick={handleAddClick} className="btn btn-primary btn-sm btn-cli">
                  NEW CATEGORY
                </button>
              )}
            </div>

            <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px dashed var(--color-border-medium)", background: "var(--color-surface)" }}>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>ID</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>NAME</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>MODULE TYPE</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>DESCRIPTION COMMENTS</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>STATUS</th>
                    <th style={{ textAlign: "center", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-dim)" }}>
                        // NO CATEGORIES DECLARED IN DATABASE SYSTEM
                      </td>
                    </tr>
                  ) : (
                    categories.map((c) => (
                      <tr 
                        key={c.id} 
                        style={{ 
                          borderBottom: "1px solid var(--color-border-subtle)", 
                          background: editingCategory?.id === c.id ? "rgba(0, 255, 65, 0.04)" : "transparent"
                        }}
                      >
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{String(c.id).padStart(3, "0")}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)", fontWeight: 500 }}>{c.name}</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <span className={`chip ${typeChips[c.type] ?? "chip-muted"}`}>
                            {typeLabels[c.type] ?? c.type}
                          </span>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{c.description || "–"}</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <span className={`chip ${c.status === "active" ? "chip-green" : "chip-muted"}`}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", textAlign: "center" }}>
                          <button 
                            onClick={() => handleEditClick(c)} 
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
          {(isAdding || editingCategory) && (
            <div className="card-elevated" style={{ height: "fit-content" }}>
              <div className="card-header">
                {isAdding ? "INITIALIZE CATEGORY" : `CONFIGURE TYPE ID: ${editingCategory?.id}`}
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  
                  {/* Name field */}
                  <div className="form-group">
                    <label className="form-label">CATEGORY NAME</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. Energy Management"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Type selection */}
                  <div className="form-group">
                    <label className="form-label">MODULE RELATION TYPE</label>
                    <div>
                      <select 
                        value={formType}
                        onChange={(e) => setFormType(e.target.value)}
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
                        <option value="csr_activity">CSR ACTIVITY</option>
                        <option value="challenge">GAMIFICATION CHALLENGE</option>
                        <option value="esg_category">ESG SCORE CATEGORY</option>
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
                        placeholder="e.g. Renewable energy initiatives and audits"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Status selection */}
                  <div className="form-group">
                    <label className="form-label">REGISTRY STATUS</label>
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
                      disabled={submitting || !formName}
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
