"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearPwaCaches } from "@/components/pwa/ServiceWorkerRegistrar";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    try {
      await clearPwaCaches();
      await fetch("/auth/sign-out", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
    } finally {
      router.replace("/sign-in");
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={signingOut}
      onClick={handleSignOut}
    >
      {signingOut ? "Signing out..." : "Sign Out"}
    </Button>
  );
}
