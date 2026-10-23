"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";
import { signOutAction } from "@/server/actions/auth-actions";

import { useLocalPreview } from "@/components/local-preview/runtime";
import { useRouter } from "next/navigation";

export function LogoutButton({ variant = "outline" }: { variant?: "outline" | "ghost" }) {
  const preview = useLocalPreview();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      disabled={pending}
      onClick={() => preview ? router.push("/preview") : startTransition(() => signOutAction())}
    >
      {pending ? ui.login.signingOut : ui.login.logout}
    </Button>
  );
}
