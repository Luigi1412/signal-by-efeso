"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";
import { signInDemo } from "@/server/actions/demo-auth";

export function DemoLoginButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        variant="brand"
        size="lg"
        className="h-11 w-full justify-between px-4 text-sm sm:w-auto sm:min-w-72"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await signInDemo();
            if (result?.error) setError(result.error);
          });
        }}
      >
        {ui.login.cta}
        <ArrowRight data-icon="inline-end" />
      </Button>
      {error ? <p className="mt-3 text-xs text-conflict">{error}</p> : null}
    </div>
  );
}
