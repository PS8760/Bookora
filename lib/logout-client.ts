"use client";

import { signOut } from "@/lib/auth-client";

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
  } finally {
    router.replace(destination);
    router.refresh();
  }
}
