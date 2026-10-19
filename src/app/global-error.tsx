"use client";

import { ui } from "@/i18n";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body className="bg-background text-foreground">
        <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-lg font-semibold">{ui.errors.title}</h1>
          <p className="text-sm text-muted-foreground">{ui.errors.body}</p>
          <button type="button" className="rounded-md border px-3 py-1.5 text-sm" onClick={reset}>
            {ui.errors.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
