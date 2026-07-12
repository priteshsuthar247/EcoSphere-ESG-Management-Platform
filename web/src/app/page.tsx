// src/app/page.tsx
// Root page — middleware handles role-based redirect.
// This component only runs if middleware allows it through (it shouldn't).
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
