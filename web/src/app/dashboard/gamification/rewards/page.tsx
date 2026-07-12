"use client";
// src/app/dashboard/gamification/rewards/page.tsx
// Rewards catalog - TerminalUI design system
// Admin: catalog CRUD + fulfill redemptions. Employees: browse catalog (own redemptions).

import { useState, useEffect } from "react";
import { useSessionRole } from "@/components/useSessionRole";

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
  const { isAdmin } = useSessionRole();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Catalog Add Drawer (admin only)
  const [isAdding, setIsAdding] = useState(false);
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
      const res = await fetch("/api/gamification/rewards");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load rewards records");
      }

      setRewards(json.data.rewards);
      setRedemptions(json.data.redemptions);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          {isAdmin ? "# ADMIN / GAMIFICATION / REWARDS" : "# GAMIFICATION / REWARDS"}
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          INCENTIVE CATALOG
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          {isAdmin
            ? "Fulfill company stock exchange redemptions, manage items availability, and reward active profiles."
            : "Browse redeemable rewards and track your redemption requests."}
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
            RETRIEVING REWARDS DIRECTORIES...
          </span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isAdmin && isAdding ? "1fr 360px" : "1fr", gap: "var(--space-6)" }}>
          
          {/* ── CATALOG AND REDEMPTIONS VIEW ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
            
            {/* Catalog section */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                <div className="card-header" style={{ marginBottom: 0 }}>ACTIVE REWARDS CATALOG</div>
                {isAdmin && !isAdding && (
                  <button onClick={() => setIsAdding(true)} className="btn btn-primary btn-sm btn-cli">
                    NEW REWARD ITEM
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
                {rewards.map((r) => (
                  <div 
                    key={r.id} 
                    className="card" 
                    style={{ 
                      display: "flex", 
                      flexDirection: "column", 
                      justifyContent: "space-between", 
                      border: r.name.includes("Stock") ? "1px solid var(--color-primary)" : "1px solid var(--color-border-subtle)",
                      background: r.name.includes("Stock") ? "rgba(0, 255, 65, 0.01)" : "var(--color-surface)"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>ID: {String(r.id).padStart(3, "0")}</span>
                        <span className={`chip ${r.status === "active" ? "chip-green" : "chip-muted"}`}>{r.status}</span>
                      </div>
                      <h3 style={{ fontSize: "15px", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>
                        {r.name}
                      </h3>
                      <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "var(--space-3)", minHeight: "40px" }}>
                        {r.description}
                      </p>
                    </div>

                    <div style={{ borderTop: "1px dashed var(--color-border-subtle)", paddingTop: "var(--space-2)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                        <span style={{ color: "var(--color-text-dim)" }}>STOCK:</span>
                        <span style={{ color: r.stock_quantity > 0 ? "var(--color-text-primary)" : "var(--color-error)", fontWeight: "bold" }}>
                          {r.stock_quantity} units
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: "13px", marginTop: "4px" }}>
                        <span style={{ color: "var(--color-text-dim)" }}>PRICE:</span>
                        <span style={{ color: "var(--color-primary)", fontWeight: "bold" }}>
                          {r.points_required} PTS
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Redemptions section */}
            <div>
              <div className="card-header">REDEMPTION REQUESTS QUEUE</div>
              
              <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px dashed var(--color-border-medium)", background: "var(--color-surface)" }}>
                      <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>ID</th>
                      <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>RECIPIENT</th>
                      <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>REDEEMED ITEM</th>
                      <th style={{ textAlign: "right", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>POINTS DEDUCTED</th>
                      <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>DATE REQUESTED</th>
                      <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>STATUS</th>
                      <th style={{ textAlign: "center", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptions.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-dim)" }}>
                          {"// NO REDEMPTION REQUESTS IN QUEUE"}
                        </td>
                      </tr>
                    ) : (
                      redemptions.map((red) => (
                        <tr 
                          key={red.id} 
                          style={{ 
                            borderBottom: "1px solid var(--color-border-subtle)",
                            background: red.status === "pending" ? "rgba(255, 102, 0, 0.02)" : "transparent"
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
                              {red.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "10px var(--space-3)", textAlign: "center" }}>
                            {!isAdmin ? (
                              <span style={{ color: "var(--color-text-dim)", fontSize: "11px" }}>—</span>
                            ) : red.status === "pending" ? (
                              <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "center" }}>
                                <button
                                  onClick={() => handleRedemptionAction(red.id, "fulfilled", "Authorized Stock Share payout.")}
                                  disabled={processingId !== null}
                                  className="btn btn-primary btn-sm"
                                >
                                  [✔] FULFILL
                                </button>
                                <button
                                  onClick={() => handleRedemptionAction(red.id, "cancelled", "Cancelled by admin request. Points refunded.")}
                                  disabled={processingId !== null}
                                  className="btn btn-danger btn-sm"
                                >
                                  [✘] CANCEL
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

          </div>

          {/* ── ADD REWARD ITEM DRAWER (admin only) ── */}
          {isAdmin && isAdding && (
            <div className="card-elevated" style={{ height: "fit-content" }}>
              <div className="card-header">ADD REWARD ITEM</div>

              <form onSubmit={handleAddSubmit}>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  
                  {/* Name */}
                  <div className="form-group">
                    <label className="form-label">ITEM NAME</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. Eco Coffee Mug"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Price */}
                  <div className="form-group">
                    <label className="form-label">POINTS COST</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input 
                        type="number" 
                        className="form-input"
                        placeholder="e.g. 500"
                        value={formPointsRequired}
                        onChange={(e) => setFormPointsRequired(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Stock */}
                  <div className="form-group">
                    <label className="form-label">STOCK QUANTITY</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input 
                        type="number" 
                        className="form-input"
                        placeholder="e.g. 100"
                        value={formStock}
                        onChange={(e) => setFormStock(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Category select */}
                  <div className="form-group">
                    <label className="form-label">REWARD CATEGORY</label>
                    <div>
                      <select 
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
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
                        <option value="gift">GIFT / VOUCHER</option>
                        <option value="financial">FINANCIAL / STOCK</option>
                        <option value="perk">OFFICE PERK</option>
                      </select>
                    </div>
                  </div>

                  {/* Status select */}
                  <div className="form-group">
                    <label className="form-label">INVENTORY STATUS</label>
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
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="form-group">
                    <label className="form-label">ITEM DESCRIPTION</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. Premium reusable stainless steel eco-mug."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div 
                    className="ascii-divider" 
                    style={{ color: "var(--color-border-subtle)", margin: "var(--space-2) 0" }}
                  >
                    {"─".repeat(24)}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "var(--space-3)" }}>
                    <button 
                      type="submit" 
                      disabled={submitting || !formName || !formPointsRequired}
                      className={`btn btn-primary btn-md btn-cli btn-full${submitting ? " btn-loading" : ""}`}
                    >
                      {submitting ? "COMMITTING" : "COMMIT"}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setIsAdding(false)}
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
