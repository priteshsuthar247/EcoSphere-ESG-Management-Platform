"use client";
// src/components/LogoutButton.tsx
// Logout button that calls POST /api/auth/logout and redirects to /login

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
      className="btn btn-danger btn-sm btn-full"
      style={{ letterSpacing: "0.04em" }}
    >
      {loading ? "LOGGING OUT..." : "$ logout"}
    </button>
  );
}
