"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

type RouterLike = {
  replace: (href: string) => void;
  refresh: () => void;
};

export async function signOutAndRedirect(
  router: RouterLike,
  destination = "/login"
) {
  try {
    await signOut();
  } catch (err) {
    console.error("Sign out failed:", err);
  } finally {
    // Hard redirect to clear everything
    window.location.href = destination;
  }
}
