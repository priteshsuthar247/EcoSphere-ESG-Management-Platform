"use client";
// src/app/dashboard/gamification/challenges/page.tsx
// Challenges panel — server-side list filters + shared UI

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
import ToolbarActions from "@/components/ui/ToolbarActions";
import SectionTitle from "@/components/ui/SectionTitle";
import StatusChip from "@/components/ui/StatusChip";
import {
  DataTableWrap,
  DataTable,
  DataTableEmptyRow,
  ActionTh,
} from "@/components/ui/DataTable";

interface Challenge {
  id: number;
  title: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  xp_reward: number;
  difficulty: string;
  evidence_required: number;
  start_date: string | null;
  end_date: string;
  status: string;
  max_participants: number | null;
}

interface Category {
  id: number;
  name: string;
  type: string;
}

export default function ChallengesManagementPage() {
  const { isAdmin, loading: roleLoading } = useSessionRole();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);

  const { draft, setSearch, setStatus, apply, queryString } = useListQuery();

  // Form parameters
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<string>("null");
  const [formXpReward, setFormXpReward] = useState("100");
  const [formDifficulty, setFormDifficulty] = useState("medium");
  const [formEvidenceRequired, setFormEvidenceRequired] = useState(true);
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formStatus, setFormStatus] = useState("draft");
  const [formMaxParticipants, setFormMaxParticipants] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = queryString ? `?${queryString}` : "";
      const challengesRes = await fetch(`/api/gamification/challenges${qs}`);
      const challengesJson = await challengesRes.json();

      if (!challengesRes.ok || !challengesJson.success) {
        throw new Error(challengesJson.error || "Failed to load challenges");
      }

      setChallenges(challengesJson.data);

      if (isAdmin) {
        const categoriesRes = await fetch("/api/admin/categories");
        const categoriesJson = await categoriesRes.json();
        if (categoriesRes.ok && categoriesJson.success) {
          const challengeCats = (categoriesJson.data as Category[]).filter(
            (c) => c.type === "challenge",
          );
          setCategories(challengeCats);
        }
      } else {
        setCategories([]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [queryString, isAdmin]);

  useEffect(() => {
    if (!roleLoading) fetchData();
  }, [roleLoading, fetchData]);

  function handleAddClick() {
    setIsAdding(true);
    setEditingChallenge(null);
    setFormTitle("");
    setFormDescription("");
    setFormCategoryId("null");
    setFormXpReward("100");
    setFormDifficulty("medium");
    setFormEvidenceRequired(true);
    setFormStartDate("");
    setFormEndDate("");
    setFormStatus("draft");
    setFormMaxParticipants("");
    setError("");
    setSuccess("");
  }

  function handleEditClick(c: Challenge) {
    setIsAdding(false);
    setEditingChallenge(c);
    setFormTitle(c.title);
    setFormDescription(c.description || "");
    setFormCategoryId(c.category_id === null ? "null" : String(c.category_id));
    setFormXpReward(String(c.xp_reward));
    setFormDifficulty(c.difficulty);
    setFormEvidenceRequired(c.evidence_required === 1);
    setFormStartDate(c.start_date ? c.start_date.split("T")[0] : "");
    setFormEndDate(c.end_date ? c.end_date.split("T")[0] : "");
    setFormStatus(c.status);
    setFormMaxParticipants(c.max_participants === null ? "" : String(c.max_participants));
    setError("");
    setSuccess("");
  }

  function closePanel() {
    setIsAdding(false);
    setEditingChallenge(null);
    setError("");
  }

  async function handleJoin(challengeId: number) {
    setJoiningId(challengeId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/gamification/participation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", challenge_id: challengeId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Could not join challenge");
      setSuccess(
        "Joined challenge. Submit proof from Challenge Approvals (managers) or contact your lead.",
      );
      await fetch("/api/gamification/participation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          id: json.data.id,
          progress_percent: 100,
        }),
      }).catch(() => {});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setJoiningId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const payload = {
      id: editingChallenge?.id,
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      categoryId: formCategoryId === "null" ? null : parseInt(formCategoryId, 10),
      xpReward: parseInt(formXpReward, 10),
      difficulty: formDifficulty,
      evidenceRequired: formEvidenceRequired,
      startDate: formStartDate || null,
      endDate: formEndDate,
      status: formStatus,
      maxParticipants: formMaxParticipants ? parseInt(formMaxParticipants, 10) : null,
    };

    try {
      const url = "/api/gamification/challenges";
      const method = editingChallenge ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to commit challenge details");
      }

      setSuccess(
        editingChallenge
          ? "Challenge details updated."
          : "New challenge registered successfully.",
      );
      setIsAdding(false);
      setEditingChallenge(null);
      fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const getChallengeSort = useCallback((c: Challenge, key: string) => {
    switch (key) {
      case "id":
        return c.id;
      case "title":
        return c.title;
      case "category":
        return c.category_name ?? "";
      case "xp":
        return c.xp_reward;
      case "difficulty":
        return c.difficulty;
      case "evidence":
        return c.evidence_required;
      case "deadline":
        return c.end_date ?? "";
      case "status":
        return c.status;
      default:
        return "";
    }
  }, []);

  const { sorted, sortKey, sortDir, toggle } = useTableSort(
    challenges,
    getChallengeSort,
    "id",
  );
  const formOpen = isAdmin && (isAdding || editingChallenge !== null);

  return (
    <div>
      <PageHeader
        title="Sustainability challenges"
        description={
          isAdmin
            ? "Configure employee sustainability goals and rewards lifecycle (Draft → Active → Under Review → Completed → Archived)."
            : "Browse active sustainability challenges and track XP rewards."
        }
      />

      {error && <AlertBanner type="error">{error}</AlertBanner>}
      {success && <AlertBanner type="success">{success}</AlertBanner>}

      {loading || roleLoading ? (
        <LoadingState label="Loading challenges…" />
      ) : (
        <>
          <TableFilters
            search={draft.search}
            onSearchChange={setSearch}
            searchPlaceholder="Search challenges, category…"
            status={draft.status}
            onStatusChange={setStatus}
            statusOptions={[
              { value: "all", label: "All statuses" },
              { value: "draft", label: "Draft" },
              { value: "active", label: "Active" },
              { value: "under_review", label: "Under review" },
              { value: "completed", label: "Completed" },
              { value: "archived", label: "Archived" },
            ]}
            onApply={apply}
            applying={loading}
          />

          {isAdmin && (
            <ToolbarActions>
              <button type="button" onClick={handleAddClick} className="btn btn-primary btn-md">
                New challenge
              </button>
            </ToolbarActions>
          )}

          <div>
            <SectionTitle>Challenges ledger</SectionTitle>
            <DataTableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <SortableTh
                      label="ID"
                      columnKey="id"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggle}
                    />
                    <SortableTh
                      label="Title"
                      columnKey="title"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggle}
                    />
                    <SortableTh
                      label="Category"
                      columnKey="category"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggle}
                    />
                    <SortableTh
                      label="Reward (XP)"
                      columnKey="xp"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggle}
                    />
                    <SortableTh
                      label="Difficulty"
                      columnKey="difficulty"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggle}
                    />
                    <SortableTh
                      label="Evidence"
                      columnKey="evidence"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggle}
                    />
                    <SortableTh
                      label="Deadline"
                      columnKey="deadline"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggle}
                    />
                    <SortableTh
                      label="Status"
                      columnKey="status"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggle}
                    />
                    <ActionTh />
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <DataTableEmptyRow colSpan={9} message="No challenges found." />
                  ) : (
                    sorted.map((c) => (
                      <tr key={c.id}>
                        <td className="col-id">{String(c.id).padStart(3, "0")}</td>
                        <td style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                          {c.title}
                        </td>
                        <td style={{ color: "var(--color-text-muted)" }}>
                          {c.category_name || "—"}
                        </td>
                        <td style={{ color: "var(--color-primary)" }}>{c.xp_reward} XP</td>
                        <td>
                          <StatusChip status={c.difficulty} />
                        </td>
                        <td style={{ color: "var(--color-text-dim)" }}>
                          {c.evidence_required === 1 ? "Required" : "Optional"}
                        </td>
                        <td style={{ color: "var(--color-text-muted)" }}>
                          {c.end_date ? c.end_date.split("T")[0] : "–"}
                        </td>
                        <td>
                          <StatusChip status={c.status} />
                        </td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleEditClick(c)}
                              className="btn btn-secondary btn-sm"
                              style={{ marginRight: 6 }}
                            >
                              Edit
                            </button>
                          )}
                          {c.status === "active" && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={joiningId === c.id}
                              onClick={() => handleJoin(c.id)}
                            >
                              {joiningId === c.id ? "Joining…" : "Join"}
                            </button>
                          )}
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
            title={isAdding ? "New challenge" : `Edit challenge #${editingChallenge?.id ?? ""}`}
            onClose={() => {
              if (!submitting) closePanel();
            }}
            width={640}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div className="form-group">
                  <label className="form-label required">Challenge title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Ride to Work Week"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="null">No category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">XP / points reward</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formXpReward}
                    onChange={(e) => setFormXpReward(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select
                    className="form-input"
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Max participants</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Leave blank for unlimited"
                    value={formMaxParticipants}
                    onChange={(e) => setFormMaxParticipants(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div className="form-group">
                    <label className="form-label">Start date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">End date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                  <label
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formEvidenceRequired}
                      onChange={(e) => setFormEvidenceRequired(e.target.checked)}
                      disabled={submitting}
                    />
                    Evidence required for submission
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">Lifecycle status</label>
                  <select
                    className="form-input"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="under_review">Under review</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <button
                    type="submit"
                    disabled={submitting || !formTitle || !formEndDate}
                    className={`btn btn-primary btn-md btn-full${submitting ? " btn-loading" : ""}`}
                  >
                    {submitting
                      ? "Saving…"
                      : editingChallenge
                        ? "Save changes"
                        : "Create challenge"}
                  </button>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="btn btn-ghost btn-md btn-full"
                    disabled={submitting}
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
