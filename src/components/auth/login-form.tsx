"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ui } from "@/i18n";
import {
  signInDemo,
  signInWithGoogle,
  signInWithMagicLink,
  signInWithPassword,
} from "@/server/actions/auth-actions";

export function LoginForm({
  demoMode,
  googleEnabled,
}: {
  demoMode: boolean;
  googleEnabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "authenticating">("idle");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signin" | "first">("signin");

  function run(action: () => Promise<{ error: string } | { ok: true; message: string } | void>) {
    setError(null);
    setInfo(null);
    setStatus("authenticating");
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) {
        setError(result.error);
        setStatus("idle");
        return;
      }
      if (result && "ok" in result && result.ok) {
        setInfo(result.message);
        setStatus("idle");
        return;
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {googleEnabled ? (
        <Button
          type="button"
          variant="brand"
          size="lg"
          className="h-11 w-full"
          disabled={pending}
          onClick={() => run(() => signInWithGoogle())}
        >
          {ui.login.continueGoogle}
        </Button>
      ) : null}

      {googleEnabled ? (
        <p className="text-center text-xs text-muted-foreground">{ui.login.orDivider}</p>
      ) : null}

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const email = String(form.get("email") ?? "");
          if (showPassword) {
            run(() =>
              signInWithPassword({
                email,
                password: String(form.get("password") ?? ""),
              }),
            );
            return;
          }
          run(() => signInWithMagicLink({ email }));
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="email">{ui.login.email}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="nome@efeso.com"
            required
            disabled={pending}
          />
        </div>

        {showPassword ? (
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
        ) : null}

        <Button type="submit" variant={googleEnabled ? "outline" : "brand"} size="lg" className="h-11 w-full justify-between px-4 text-sm" disabled={pending}>
          {pending || status === "authenticating"
            ? ui.login.authenticating
            : showPassword
              ? ui.login.ctaPassword
              : mode === "first"
                ? ui.login.ctaFirstAccess
                : ui.login.ctaMagic}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </form>

      <div className="flex flex-col gap-2 text-sm">
        <button
          type="button"
          className="text-left text-muted-foreground underline-offset-4 hover:underline"
          disabled={pending}
          onClick={() => {
            setShowPassword((value) => !value);
            setError(null);
            setInfo(null);
          }}
        >
          {showPassword ? ui.login.useMagicLink : ui.login.usePassword}
        </button>
        <button
          type="button"
          className="text-left text-muted-foreground underline-offset-4 hover:underline"
          disabled={pending}
          onClick={() => {
            setMode((value) => (value === "first" ? "signin" : "first"));
            setShowPassword(false);
            setError(null);
            setInfo(null);
          }}
        >
          {mode === "first" ? ui.login.alreadyHaveAccess : ui.login.firstAccessPrompt}
        </button>
      </div>

      {demoMode ? (
        <div className="flex flex-col gap-2 border-t pt-4">
          <p className="text-xs text-muted-foreground">{ui.login.demoHint}</p>
          <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => signInDemo("member"))}>
            {ui.login.demoMember}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => signInDemo("admin"))}>
            {ui.login.demoAdmin}
          </Button>
        </div>
      ) : null}

      {info ? <p className="text-xs text-muted-foreground">{info}</p> : null}
      {error ? <p className="text-xs text-conflict">{error}</p> : null}
    </div>
  );
}
