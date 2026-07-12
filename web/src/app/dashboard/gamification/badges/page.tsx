"use client";
// src/app/dashboard/gamification/badges/page.tsx
// Badges Dashboard - TerminalUI design system
// Admin: re-evaluate unlocks. Employees: view catalog + awards.

import { useState, useEffect } from "react";
import { useSessionRole } from "@/components/useSessionRole";

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

  const badgeColors: Record<string, string> = {
    "Bronze Badge": "#CD7F32",
    "Silver Badge": "#C0C0C0",
    "Gold Badge": "#FFD700",
    "Platinum Badge": "#E5E4E2",
    "Diamond Badge": "#B9F2FF",
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
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          {isAdmin ? "# ADMIN / GAMIFICATION / BADGES" : "# GAMIFICATION / BADGES"}
        </div>
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
                className={`btn btn-secondary btn-sm btn-cli${evaluating ? " btn-loading" : ""}`}
              >
                RE-EVALUATE BADGES
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
            {orderedBadges.map((b, index) => {
              const pts = pointsRequired(b.unlock_rule);
              const borderCol = badgeColors[b.name] || "var(--color-border-medium)";
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
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "var(--color-text-dim)",
                      letterSpacing: "0.08em",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    TIER {tier}
                    {isLowest ? " · LOWEST" : ""}
                    {isHighest ? " · HIGHEST" : ""}
                  </div>
                  <div style={{ fontSize: "32px", marginBottom: "var(--space-2)" }}>{icon}</div>
                  <h3 style={{ fontSize: "16px", color: borderCol, marginBottom: "4px", fontWeight: 700 }}>
                    {b.name.replace(" Badge", "")}
                  </h3>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      color: "var(--color-primary)",
                      fontWeight: "bold",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    ≥ {pts.toLocaleString()} PTS
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                    {b.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ── RECENT AWARDS TABLE ── */}
          <div className="card-header">UNLOCKED ACHIEVEMENTS LEDGER</div>
          
          <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px dashed var(--color-border-medium)", background: "var(--color-surface)" }}>
                  <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>RECIPIENT</th>
                  <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>BADGE UNLOCKED</th>
                  <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>DATE EARNED</th>
                  <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>VERIFICATION COMMENT</th>
                </tr>
              </thead>
              <tbody>
                {awarded.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-dim)" }}>
                      {"// NO BADGES AWARDED TO DATE"}
                    </td>
                  </tr>
                ) : (
                  awarded.map((a) => (
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
