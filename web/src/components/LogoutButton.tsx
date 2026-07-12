"use client";
// Logout button — icon-only when sidebar is collapsed

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

  return (
    <button
      id="logout-btn"
      onClick={handleLogout}
      disabled={loading}
      className={`btn btn-ghost btn-sm btn-full${collapsed ? " logout-btn-icon" : ""}`}
      title="Sign out"
      aria-label="Sign out"
    >
      {collapsed ? (
        loading ? (
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
        )
      ) : loading ? (
        "Signing out…"
      ) : (
        "Sign out"
      )}
    </button>
  );
}
