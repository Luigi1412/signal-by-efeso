"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ui } from "@/i18n";
import { signInDemo, signInWithPassword } from "@/server/actions/demo-auth";

export function LoginForm({ demoMode }: { demoMode: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "authenticating">("idle");

  function run(action: () => Promise<{ error: string } | void>) {
    setError(null);
    setStatus("authenticating");
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
        setStatus("idle");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-col gap-3"
        method="post"
        action="/login"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const form = new FormData(event.currentTarget);
          run(() =>
            signInWithPassword({
              email: String(form.get("email") ?? ""),
              password: String(form.get("password") ?? ""),
            }),
          );
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="email">{ui.login.email}</Label>
          <Input id="email" name="email" type="email" autoComplete="username" required disabled={pending} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">{ui.login.password}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={pending}
          />
        </div>
        <Button type="submit" variant="brand" size="lg" className="h-11 w-full justify-between px-4 text-sm" disabled={pending}>
          {pending || status === "authenticating" ? ui.login.authenticating : ui.login.cta}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </form>

      {demoMode ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">{ui.login.demoHint}</p>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => signInDemo("member"))}
          >
            {ui.login.demoMember}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => signInDemo("admin"))}
          >
            {ui.login.demoAdmin}
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-conflict">{error}</p> : null}
    </div>
  );
}
