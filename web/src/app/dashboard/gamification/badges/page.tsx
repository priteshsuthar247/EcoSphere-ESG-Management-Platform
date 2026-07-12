"use client";
// src/app/dashboard/gamification/badges/page.tsx
// Badges Dashboard - TerminalUI design system
// Admin: re-evaluate unlocks. Employees: view catalog + awards.

import { useState, useEffect } from "react";
import { useSessionRole } from "@/components/useSessionRole";
import TableFilters, { matchesSearch } from "@/components/TableFilters";

interface Badge {
  id: number;
  name: string;
  description: string | null;
  icon_url: string | null;
  unlock_rule: {
    points_required?: number;
  };
  status: string;
}

interface AwardedBadge {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  badge_id: number;
  badge_name: string;
  awarded_at: string;
  awarded_reason: string | null;
}

export default function BadgesDashboardPage() {
  const { isAdmin } = useSessionRole();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [awarded, setAwarded] = useState<AwardedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [awardSearch, setAwardSearch] = useState("");

  useEffect(() => {
    fetchBadges();
  }, []);

  async function fetchBadges() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/gamification/badges");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load badges catalog");
      }

      setBadges(json.data.badges);
      setAwarded(json.data.awarded);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReevaluate() {
    setEvaluating(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/gamification/badges", {
        method: "POST"
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to execute re-evaluation");
      }

      setSuccess(`System-wide evaluation completed. Awarded ${json.data.awardedCount} new badges!`);
      fetchBadges();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEvaluating(false);
    }
  }

  // High-contrast tier colours (readable on light Notion surfaces)
  const badgeColors: Record<string, string> = {
    "Bronze Badge": "#9A5B1A",
    "Silver Badge": "#4B5563",
    "Gold Badge": "#B45309",
    "Platinum Badge": "#334155",
    "Diamond Badge": "#1D4ED8",
  };

  const badgeSurfaces: Record<string, string> = {
    "Bronze Badge": "#FEF3C7",
    "Silver Badge": "#F1F5F9",
    "Gold Badge": "#FEF9C3",
    "Platinum Badge": "#E2E8F0",
    "Diamond Badge": "#DBEAFE",
  };

  const badgeIcons: Record<string, string> = {
    "Bronze Badge": "🥉",
    "Silver Badge": "🥈",
    "Gold Badge": "🥇",
    "Platinum Badge": "💠",
    "Diamond Badge": "💎",
  };

  function pointsRequired(rule: Badge["unlock_rule"] | string | null | undefined): number {
    if (!rule) return 0;
    const parsed =
      typeof rule === "string"
        ? (() => {
            try {
              return JSON.parse(rule);
            } catch {
              return {};
            }
          })()
        : rule;
    return Number(parsed?.points_required) || 0;
  }

  // Always display lowest → highest: Bronze (1k) … Diamond (12k)
  const orderedBadges = [...badges].sort(
    (a, b) => pointsRequired(a.unlock_rule) - pointsRequired(b.unlock_rule),
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          ACHIEVEMENT BADGES
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Tier ladder (lowest → highest): Bronze → Silver → Gold → Platinum → Diamond.
          {isAdmin
            ? " Re-evaluate unlocks from employee ESG points balance."
            : " Earn more ESG points to climb the ladder."}
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
          <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>
            RETRIEVING ACHIEVEMENT DIRECTORIES...
          </span>
        </div>
      ) : (
        <div>
          {/* ── VISUAL GALLERY GRID ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
            <div className="card-header" style={{ marginBottom: 0 }}>
              BADGE TIER LADDER (LOW → HIGH)
            </div>
            {isAdmin && (
              <button 
                onClick={handleReevaluate} 
                disabled={evaluating}
                className={`btn btn-secondary btn-sm${evaluating ? " btn-loading" : ""}`}
              >
                RE-EVALUATE BADGES
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
            {orderedBadges.map((b, index) => {
              const pts = pointsRequired(b.unlock_rule);
              const borderCol = badgeColors[b.name] || "var(--color-border-medium)";
              const surface = badgeSurfaces[b.name] || "var(--color-bg)";
              const icon = badgeIcons[b.name] || "🏆";
              const tier = index + 1;
              const isLowest = index === 0;
              const isHighest = index === orderedBadges.length - 1;
              return (
                <div
                  key={b.id}
                  className="card-elevated"
                  style={{
                    borderTop: `4px solid ${borderCol}`,
                    textAlign: "center",
                    position: "relative",
                    background: surface,
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: borderCol,
                      letterSpacing: "0.04em",
                      marginBottom: "var(--space-2)",
                      textTransform: "uppercase",
                    }}
                  >
                    Tier {tier}
                    {isLowest ? " · Lowest" : ""}
                    {isHighest ? " · Highest" : ""}
                  </div>
                  <div style={{ fontSize: "32px", marginBottom: "var(--space-2)" }}>{icon}</div>
                  <h3 style={{ fontSize: "16px", color: borderCol, marginBottom: "4px", fontWeight: 700 }}>
                    {b.name.replace(" Badge", "")}
                  </h3>
                  <div
                    style={{
                      fontSize: "13px",
                      color: borderCol,
                      fontWeight: 700,
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    ≥ {pts.toLocaleString()} pts
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--color-ink-secondary)" }}>
                    {b.description}
                  </p>
                </div>
              );
            })}
          </div>

          <TableFilters
            search={awardSearch}
            onSearchChange={setAwardSearch}
            searchPlaceholder="Search awards by recipient or badge…"
          />
          <div className="card-header">Unlocked achievements ledger</div>
          
          <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)", borderRadius: "var(--radius-lg)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-medium)", background: "var(--color-surface)" }}>
                  <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Recipient</th>
                  <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Badge unlocked</th>
                  <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Date earned</th>
                  <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Verification comment</th>
                </tr>
              </thead>
              <tbody>
                {awarded.filter((a) => matchesSearch(awardSearch, [a.user_name, a.user_email, a.badge_name, a.awarded_reason])).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-dim)" }}>
                      No badges awarded yet
                    </td>
                  </tr>
                ) : (
                  awarded.filter((a) => matchesSearch(awardSearch, [a.user_name, a.user_email, a.badge_name, a.awarded_reason])).map((a) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                      <td style={{ padding: "10px var(--space-3)" }}>
                        <div style={{ color: "var(--color-text-primary)" }}>{a.user_name}</div>
                        <div style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>{a.user_email}</div>
                      </td>
                      <td style={{ padding: "10px var(--space-3)", fontWeight: 700, color: badgeColors[a.badge_name] || "var(--color-text-primary)" }}>
                        🏅 {a.badge_name}
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>
                        {a.awarded_at ? a.awarded_at.split("T")[0] : ""}
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>
                        {a.awarded_reason}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );
}
