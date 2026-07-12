"use client";
// Logout button — Tailwind utilities; icon-only when sidebar is collapsed

import { useState } from "react";

export default function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      window.location.assign("/login");
    }
  }

  if (collapsed) {
    return (
      <button
        id="logout-btn"
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="logout-btn-icon flex h-10 w-10 items-center justify-center rounded-md border border-hairline bg-canvas text-ink-muted transition hover:border-danger hover:bg-danger-soft hover:text-danger disabled:opacity-45"
        title="Sign out"
        aria-label="Sign out"
      >
        {loading ? (
          "…"
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      id="logout-btn"
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="btn btn-ghost btn-sm btn-full w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm font-medium text-ink-secondary transition hover:bg-canvas disabled:opacity-45"
      title="Sign out"
      aria-label="Sign out"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
