"use client";
// Logout button — Notion-inspired utility style

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }

  return (
    <button
      id="logout-btn"
      onClick={handleLogout}
      disabled={loading}
      className="btn btn-ghost btn-sm btn-full"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
