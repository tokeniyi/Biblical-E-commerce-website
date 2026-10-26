"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { api } from "@/lib/api/client";

type SignOutButtonProps = {
  /** Destination after sign-out: A14 signed-out variant, or B01 for staff. */
  redirectTo: string;
  children: ReactNode;
};

export function SignOutButton({ redirectTo, children }: SignOutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await api.signOut();
    } catch {
      // Even if the call fails, leave the signed-in area; the server is
      // authoritative and the next guarded request re-checks the session.
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={pending}
      aria-busy={pending}
      className="cursor-pointer text-left hover:underline disabled:cursor-wait"
    >
      {children}
    </button>
  );
}
