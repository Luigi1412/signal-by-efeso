"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import {
  previewExternalResearchAction,
  startExternalResearchAction,
  type PreviewResearchResult,
} from "@/server/actions/external-research-actions";

export function CompanySearch() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Extract<PreviewResearchResult, { ok: true }> | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    startTransition(async () => {
      setError(null);
      const result = await previewExternalResearchAction({ query: value });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPreview(result);
    });
  }

  function startResearch(extra?: { existingSlug?: string; selectedDomain?: string; query?: string }) {
    const value = extra?.query ?? query.trim();
    startTransition(async () => {
      setError(null);
      const result = await startExternalResearchAction({
        query: value,
        existingSlug: extra?.existingSlug,
        selectedDomain: extra?.selectedDomain,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(routes.research(result.runId));
    });
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-shadow focus-within:border-ring/70 focus-within:shadow-[0_0_0_3px_oklch(0.7_0.008_260/0.15)] sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-3 px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPreview(null);
              }}
              placeholder={ui.home.searchPlaceholder}
              aria-label={ui.home.searchAria}
              className="h-10 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/80"
            />
          </div>
          <Button type="submit" variant="brand" size="lg" className="h-10 px-4" disabled={pending}>
            {ui.externalResearch.searchCta}
          </Button>
        </div>
      </form>
      {error ? <p className="mt-2.5 text-center text-xs text-conflict">{error}</p> : null}

      {preview?.kind === "existing" ? (
        <div className="mt-4 rounded-lg border bg-card p-4">
          <p className="text-sm font-medium text-foreground">{preview.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {[preview.country, preview.industry, preview.domain].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="brand" disabled={pending} onClick={() => router.push(routes.company(preview.slug))}>
              {ui.externalResearch.openCompany}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => startResearch({ existingSlug: preview.slug, query: preview.name })}
            >
              {ui.externalResearch.updateAnalysis}
            </Button>
          </div>
        </div>
      ) : null}

      {preview?.kind === "resolved" ? (
        <div className="mt-4 rounded-lg border bg-card p-4">
          <p className="text-sm font-medium text-foreground">{preview.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {[preview.country, preview.industry, preview.domain].filter(Boolean).join(" · ")}
          </p>
          <Button
            type="button"
            variant="brand"
            className="mt-3"
            disabled={pending}
            onClick={() => startResearch({ selectedDomain: preview.domain, query: preview.name })}
          >
            {ui.externalResearch.startAnalysis}
          </Button>
        </div>
      ) : null}

      {preview?.kind === "ambiguous" || preview?.kind === "unresolved" ? (
        <div className="mt-4 rounded-lg border bg-card p-4">
          <p className="text-sm font-medium text-foreground">{ui.externalResearch.chooseCompany}</p>
          <ul className="mt-3 space-y-2">
            {(preview.kind === "ambiguous" ? preview.candidates : preview.suggestions).map((candidate) => (
              <li key={candidate.domain || candidate.name} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm text-foreground">{candidate.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[candidate.country, candidate.industry, candidate.domain].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => startResearch({ selectedDomain: candidate.domain, query: candidate.name })}
                >
                  {ui.externalResearch.startAnalysis}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
    </div>
  );
}
