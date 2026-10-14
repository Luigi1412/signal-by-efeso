"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findCompanyByName } from "@/data";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { startAnalysisAction } from "@/server/actions/analysis-actions";

/** Central search field. Unknown companies never silently fall back to Natura. */
export function CompanySearch() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;

    startTransition(async () => {
      setError(null);
      const result = await startAnalysisAction({
        companyQuery: value,
        geography: "Brazil",
        focus: "General EFESO opportunity scan",
      });

      if (result.ok) {
        router.push(routes.analysisResolve(result.slug, result.analysisId));
        return;
      }
      if (result.reason === "unauthenticated") {
        router.push(routes.login);
        return;
      }
      if (result.reason === "fallback") {
        const match = findCompanyByName(value);
        if (!match) {
          router.push(`${routes.analysisUnavailable}?q=${encodeURIComponent(value)}`);
          return;
        }
        router.push(routes.analysisResolve(match.slug));
        return;
      }
      setError(ui.persistence.startFailed);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-shadow focus-within:border-ring/70 focus-within:shadow-[0_0_0_3px_oklch(0.7_0.008_260/0.15)] sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3 px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={ui.home.searchPlaceholder}
            aria-label={ui.home.searchAria}
            className="h-10 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/80"
          />
        </div>
        <Button type="submit" variant="brand" size="lg" className="h-10 px-4" disabled={pending}>
          {ui.home.analyzeCta}
        </Button>
      </div>
      {error ? <p className="mt-2.5 text-center text-xs text-conflict">{error}</p> : null}
      <p className="mt-2.5 text-center text-xs text-muted-foreground">
        {ui.home.tryPrefix}{" "}
        <button type="button" onClick={() => setQuery("Natura")} className="font-medium text-foreground underline-offset-4 hover:underline">
          Natura
        </button>
        ,{" "}
        <button type="button" onClick={() => setQuery("Vale")} className="font-medium text-foreground underline-offset-4 hover:underline">
          Vale
        </button>{" "}
        {ui.home.tryConjunction}{" "}
        <button type="button" onClick={() => setQuery("Umicore")} className="font-medium text-foreground underline-offset-4 hover:underline">
          Umicore
        </button>
        .
      </p>
    </form>
  );
}
