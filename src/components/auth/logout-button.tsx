"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";
import { signOutAction } from "@/server/actions/demo-auth";

export function LogoutButton({ variant = "outline" }: { variant?: "outline" | "ghost" }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => signOutAction())}
    >
      {pending ? ui.login.signingOut : ui.login.logout}
    </Button>
  );
}
