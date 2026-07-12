"use client";
// src/app/dashboard/gamification/rewards/page.tsx
// Rewards catalog - TerminalUI design system
// Admin: catalog CRUD + fulfill redemptions. Employees: browse catalog (own redemptions).

import { useState, useEffect, useCallback } from "react";
import { useSessionRole } from "@/components/useSessionRole";
import Modal from "@/components/Modal";
import TableFilters, { matchesSearch, matchesStatus } from "@/components/TableFilters";
import { useTableSort } from "@/components/useTableSort";
import SortableTh from "@/components/SortableTh";

interface Reward {
  id: number;
  name: string;
  description: string | null;
  points_required: number;
  stock_quantity: number;
  category: string | null;
  status: string;
}

interface Redemption {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  reward_id: number;
  reward_name: string;
  points_required: number;
  redeemed_at: string;
  points_deducted: number;
  status: string;
  fulfilled_by: number | null;
  fulfilled_at: string | null;
  notes: string | null;
}

export default function RewardsManagementPage() {
  const { isAdmin, role } = useSessionRole();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [redeemingId, setRedeemingId] = useState<number | null>(null);
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [redemptionSearch, setRedemptionSearch] = useState("");
  const [redemptionStatus, setRedemptionStatus] = useState("all");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPointsRequired, setFormPointsRequired] = useState("1000");
  const [formStock, setFormStock] = useState("100");
  const [formCategory, setFormCategory] = useState("gift");
  const [formStatus, setFormStatus] = useState("active");
  const [submitting, setSubmitting] = useState(false);

  // Redemption Action
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [rewardsRes, meRes] = await Promise.all([
        fetch("/api/gamification/rewards"),
        fetch("/api/auth/me"),
      ]);
      const json = await rewardsRes.json();

      if (!rewardsRes.ok || !json.success) {
        throw new Error(json.error || "Failed to load rewards records");
      }

      setRewards(json.data.rewards);
      setRedemptions(json.data.redemptions);

      if (meRes.ok) {
        const meJson = await meRes.json();
        if (meJson.success && meJson.data) {
          const bal = meJson.data.esg_points_balance ?? meJson.data.points;
          if (bal !== undefined && bal !== null) setPointsBalance(Number(bal));
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeem(reward: Reward) {
    if (reward.stock_quantity <= 0 || reward.status !== "active") return;
    setRedeemingId(reward.id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/gamification/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "redeem", rewardId: reward.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Redemption failed");
      }
      setSuccess(
        `Redeemed "${reward.name}" for ${reward.points_required} points. Awaiting fulfillment.`,
      );
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRedeemingId(null);
    }
  }

  const canRedeem = role === "employee" || role === "departmental_head" || role === "ceo" || role === "admin";

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/gamification/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          pointsRequired: parseInt(formPointsRequired, 10),
          stockQuantity: parseInt(formStock, 10),
          category: formCategory,
          status: formStatus
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to add reward");
      }

      setSuccess("New reward added to catalog catalog.");
      setIsAdding(false);
      fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRedemptionAction(id: number, status: "fulfilled" | "cancelled", notes: string = "") {
    setProcessingId(id);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/gamification/rewards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redemptionId: id,
          status,
          notes
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to process redemption request");
      }

      setSuccess(`Redemption request successfully marked as ${status}.`);
      fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProcessingId(null);
    }
  }

  const filteredRewards = rewards.filter(
    (r) =>
      matchesStatus(statusFilter, r.status) &&
      matchesSearch(search, [r.id, r.name, r.description, r.category]),
  );
  const filteredRedemptions = redemptions.filter(
    (red) =>
      matchesStatus(redemptionStatus, red.status) &&
      matchesSearch(redemptionSearch, [red.id, red.user_name, red.user_email, red.reward_name]),
  );

  const getRedemptionSort = useCallback((row: Redemption, key: string): unknown => {
    switch (key) {
      case "id": return row.id;
      case "recipient": return row.user_name;
      case "item": return row.reward_name;
      case "points": return row.points_deducted;
      case "date": return row.redeemed_at ?? "";
      case "status": return row.status;
      default: return null;
    }
  }, []);

  const {
    sorted: sortedRedemptions,
    sortKey: redSortKey,
    sortDir: redSortDir,
    toggle: redToggle,
  } = useTableSort(filteredRedemptions, getRedemptionSort, "id");

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          INCENTIVE CATALOG
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          {isAdmin
            ? "Fulfill redemptions, manage catalog stock, and track incentive spend."
            : "Redeem ESG points for catalog rewards (subject to stock). Points are deducted immediately."}
        </p>
        {pointsBalance !== null && (
          <p style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: "var(--color-primary)" }}>
            Your balance: {pointsBalance} pts
          </p>
        )}
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
          <span style={{ marginLeft: "var(--space-3)" }}>Loading rewards…</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
          <div>
            <TableFilters
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search rewards…"
              status={statusFilter}
              onStatusChange={setStatusFilter}
              statusOptions={[
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "draft", label: "Draft" },
              ]}
              extra={
                isAdmin ? (
                  <button type="button" onClick={() => setIsAdding(true)} className="btn btn-primary btn-md">
                    New reward item
                  </button>
                ) : null
              }
            />
            <div className="card-header">Active rewards catalog</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
              {filteredRewards.map((r) => (
                <div
                  key={r.id}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    border: "1px solid var(--color-border-subtle)",
                    background: "var(--color-surface)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>ID {String(r.id).padStart(3, "0")}</span>
                      <span className={`chip ${r.status === "active" ? "chip-green" : "chip-muted"}`}>{r.status}</span>
                    </div>
                    <h3 style={{ fontSize: "15px", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>
                      {r.name}
                    </h3>
                    <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "var(--space-3)", minHeight: "40px" }}>
                      {r.description}
                    </p>
                  </div>
                  <div style={{ borderTop: "1px solid var(--color-border-subtle)", paddingTop: "var(--space-2)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span style={{ color: "var(--color-text-dim)" }}>Stock:</span>
                      <span style={{ color: r.stock_quantity > 0 ? "var(--color-text-primary)" : "var(--color-error)", fontWeight: "bold" }}>
                        {r.stock_quantity} units
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginTop: "4px" }}>
                      <span style={{ color: "var(--color-text-dim)" }}>Price:</span>
                      <span style={{ color: "var(--color-primary)", fontWeight: "bold" }}>
                        {r.points_required} PTS
                      </span>
                    </div>
                    {canRedeem && r.status === "active" && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm btn-full"
                        style={{ marginTop: "var(--space-3)" }}
                        disabled={
                          r.stock_quantity <= 0 ||
                          redeemingId === r.id ||
                          (pointsBalance !== null && pointsBalance < r.points_required)
                        }
                        onClick={() => handleRedeem(r)}
                      >
                        {redeemingId === r.id
                          ? "Redeeming…"
                          : r.stock_quantity <= 0
                            ? "Out of stock"
                            : pointsBalance !== null && pointsBalance < r.points_required
                              ? "Not enough points"
                              : "Redeem"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <TableFilters
              search={redemptionSearch}
              onSearchChange={setRedemptionSearch}
              searchPlaceholder="Search redemptions…"
              status={redemptionStatus}
              onStatusChange={setRedemptionStatus}
              statusOptions={[
                { value: "all", label: "All statuses" },
                { value: "pending", label: "Pending" },
                { value: "fulfilled", label: "Fulfilled" },
                { value: "cancelled", label: "Cancelled" },
              ]}
            />
            <div className="card-header">Redemption requests queue</div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableTh label="ID" columnKey="id" sortKey={redSortKey} sortDir={redSortDir} onSort={redToggle} />
                    <SortableTh label="Recipient" columnKey="recipient" sortKey={redSortKey} sortDir={redSortDir} onSort={redToggle} />
                    <SortableTh label="Item" columnKey="item" sortKey={redSortKey} sortDir={redSortDir} onSort={redToggle} />
                    <SortableTh label="Points" columnKey="points" sortKey={redSortKey} sortDir={redSortDir} onSort={redToggle} align="right" />
                    <SortableTh label="Date" columnKey="date" sortKey={redSortKey} sortDir={redSortDir} onSort={redToggle} />
                    <SortableTh label="Status" columnKey="status" sortKey={redSortKey} sortDir={redSortDir} onSort={redToggle} />
                    <th className="sortable-th" style={{ textAlign: "center", cursor: "default" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRedemptions.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-dim)" }}>
                        No redemption requests in queue.
                      </td>
                    </tr>
                  ) : (
                    sortedRedemptions.map((red) => (
                      <tr
                        key={red.id}
                        style={{
                          borderBottom: "1px solid var(--color-border-subtle)",
                          background: red.status === "pending" ? "rgba(255, 102, 0, 0.02)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{String(red.id).padStart(3, "0")}</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <div style={{ color: "var(--color-text-primary)" }}>{red.user_name}</div>
                          <div style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>{red.user_email}</div>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)", fontWeight: 500 }}>
                          {red.reward_name}
                        </td>
                        <td style={{ padding: "10px var(--space-3)", textAlign: "right", color: "var(--color-secondary)" }}>
                          -{red.points_deducted} PTS
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>
                          {red.redeemed_at ? red.redeemed_at.split("T")[0] : ""}
                        </td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <span className={`chip ${red.status === "fulfilled" ? "chip-green" : red.status === "pending" ? "chip-amber" : "chip-muted"}`}>
                            {red.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", textAlign: "center" }}>
                          {!isAdmin ? (
                            <span style={{ color: "var(--color-text-dim)", fontSize: "11px" }}>—</span>
                          ) : red.status === "pending" ? (
                            <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleRedemptionAction(red.id, "fulfilled", "Authorized Stock Share payout.")}
                                disabled={processingId !== null}
                                className="btn btn-primary btn-sm"
                              >
                                Fulfill
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRedemptionAction(red.id, "cancelled", "Cancelled by admin request. Points refunded.")}
                                disabled={processingId !== null}
                                className="btn btn-danger btn-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>
                              Processed {red.fulfilled_at ? red.fulfilled_at.split("T")[0] : ""}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Modal
            open={isAdmin && isAdding}
            title="Add reward item"
            onClose={() => { if (!submitting) setIsAdding(false); }}
            width={560}
          >
            <form onSubmit={handleAddSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div className="form-group">
                  <label className="form-label required">Item name</label>
                  <input type="text" className="form-input" placeholder="e.g. Eco Coffee Mug" value={formName} onChange={(e) => setFormName(e.target.value)} required disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label required">Points cost</label>
                  <input type="number" className="form-input" value={formPointsRequired} onChange={(e) => setFormPointsRequired(e.target.value)} required disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label required">Stock quantity</label>
                  <input type="number" className="form-input" value={formStock} onChange={(e) => setFormStock(e.target.value)} required disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} disabled={submitting}>
                    <option value="gift">Gift / voucher</option>
                    <option value="financial">Financial / stock</option>
                    <option value="perk">Office perk</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Inventory status</label>
                  <select className="form-input" value={formStatus} onChange={(e) => setFormStatus(e.target.value)} disabled={submitting}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input type="text" className="form-input" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} disabled={submitting} />
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <button type="submit" disabled={submitting || !formName || !formPointsRequired} className={`btn btn-primary btn-md btn-full${submitting ? " btn-loading" : ""}`}>
                    {submitting ? "Saving…" : "Create reward"}
                  </button>
                  <button type="button" onClick={() => setIsAdding(false)} className="btn btn-ghost btn-md btn-full" disabled={submitting}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </Modal>
        </div>
      )}
    </div>
  );
}
