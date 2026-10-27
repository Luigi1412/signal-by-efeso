"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import {
  previewExternalResearchAction,
  startExternalResearchAction,
  type PreviewResearchResult,
} from "@/server/actions/external-research-actions";

import { useLocalPreview } from "@/components/local-preview/runtime";
import { localPreviewHref } from "@/lib/local-preview";

type PreviewOk = Extract<PreviewResearchResult, { ok: true }>;

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    ?.replace(/\/$/, "") ?? "";
}

function normalizeCountry(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === "brasil" || lower === "brazil" || lower === "br") return "BR";
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return trimmed;
}

export function NewResearchForm({ initialCompanyName = "" }: { initialCompanyName?: string } = {}) {
  const localPreview = useLocalPreview();
  const identify = localPreview?.identify ?? previewExternalResearchAction;
  const start = localPreview?.start ?? startExternalResearchAction;
  const href = localPreview ? localPreviewHref : (value: string) => value;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewOk | null>(null);

  const isValid = companyName.trim().length > 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!isValid) return;
    startTransition(async () => {
      setError(null);
      setPreview(null);
      const result = await identify({
        query: companyName.trim(),
        country: normalizeCountry(country),
        selectedDomain: website.trim() ? normalizeDomain(website) : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPreview(result);
    });
  }

  function startResearch(extra: {
    query?: string;
    existingSlug?: string;
    selectedDomain?: string;
    confirmUnresolved?: boolean;
  }) {
    startTransition(async () => {
      setError(null);
      const domain = extra.selectedDomain ?? (website.trim() ? normalizeDomain(website) : undefined);
      const result = await start({
        query: extra.query?.trim() || companyName.trim(),
        country: normalizeCountry(country),
        existingSlug: extra.existingSlug,
        selectedDomain: domain,
        confirmUnresolved: true,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(href(routes.research(result.runId)));
    });
  }

  return (
    <div className="research-form flex flex-col gap-8">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <div className="grid gap-2">
          <Label htmlFor="company-name">
            {ui.newAnalysis.companyName} <span className="text-brand">*</span>
          </Label>
          <div className="relative"><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input
            id="company-name"
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              setPreview(null);
            }}
            placeholder="Pesquise pelo nome da empresa…"
            autoComplete="off"
            aria-invalid={touched && !isValid}
            aria-describedby="company-name-help"
            className="h-20 rounded-md border-border bg-card pl-12 text-base shadow-none md:text-lg"
            autoFocus
          /></div>
          {touched && !isValid ? (
            <p id="company-name-help" role="alert" className="text-xs text-conflict">{ui.newAnalysis.companyNameError}</p>
          ) : (
            <p id="company-name-help" className="text-xs text-muted-foreground">{ui.newAnalysis.companyNameHint}</p>
          )}
        </div>

        <details className="group"><summary className="w-fit cursor-pointer text-sm text-muted-foreground">Mais opções</summary><div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="company-website">
              {ui.newAnalysis.website}{" "}
              <span className="font-normal text-muted-foreground">{ui.newAnalysis.optional}</span>
            </Label>
            <Input
              id="company-website"
              value={website}
              onChange={(e) => {
                setWebsite(e.target.value);
                setPreview(null);
              }}
              placeholder={ui.newAnalysis.websitePlaceholder}
              inputMode="url"
              autoComplete="off"
              className="h-10"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="country">
              {ui.newAnalysis.geography}{" "}
              <span className="font-normal text-muted-foreground">{ui.newAnalysis.optional}</span>
            </Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setPreview(null);
              }}
              placeholder={ui.newAnalysis.countryPlaceholder}
              autoComplete="off"
              className="h-10"
            />
          </div>
        </div>

        </details>

        <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p role={error ? "alert" : undefined} className={`text-xs ${error ? "text-conflict" : "text-muted-foreground"}`}>{error ?? ui.newAnalysis.hint}</p>
          <Button type="submit" variant="brand" size="lg" className="h-12 px-7" disabled={pending}>
            {pending ? "Identificando empresa…" : ui.newAnalysis.cta}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </form>

      {preview?.kind === "existing" ? (
        <div className="border-t border-brand/25 pt-6" role="status" aria-live="polite">
          <p className="text-sm font-medium">{ui.companyReport.confirmCompany}</p>
          <p className="mt-2 text-base font-semibold">{preview.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {[preview.country, preview.industry, preview.domain].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="brand" disabled={pending} onClick={() => router.push(href(routes.company(preview.slug)))}>
              {ui.externalResearch.openCompany}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => startResearch({ existingSlug: preview.slug, query: preview.name, selectedDomain: preview.domain })}
            >
              {ui.companyReport.updateResearch}
            </Button>
          </div>
        </div>
      ) : null}

      {preview?.kind === "resolved" ? (
        <div className="border-t border-brand/25 pt-6" role="status" aria-live="polite">
          <p className="text-sm font-medium">{ui.companyReport.confirmCompany}</p>
          <p className="mt-2 text-base font-semibold">{preview.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {[preview.country, preview.industry, preview.domain].filter(Boolean).join(" · ")}
          </p>
          <Button
            type="button"
            variant="brand"
            className="mt-4"
            disabled={pending}
            onClick={() => startResearch({ selectedDomain: preview.domain || normalizeDomain(website) || undefined, query: preview.name })}
          >
            {ui.externalResearch.startAnalysis}
          </Button>
        </div>
      ) : null}

      {preview?.kind === "ambiguous" ? (
        <div className="border-t border-brand/25 pt-6" role="status" aria-live="polite">
          <p className="text-sm font-medium">{ui.companyReport.ambiguousTitle}</p>
          <ul className="mt-4 divide-y border-y">
            {preview.candidates.map((candidate) => (
              <li key={candidate.domain || candidate.name} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">{candidate.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[candidate.country, candidate.domain].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => startResearch({ selectedDomain: candidate.domain, query: candidate.name })}
                >
                  Selecionar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview?.kind === "unresolved" ? (
        <div className="border-t border-brand/25 pt-6" role="status" aria-live="polite">
          <p className="text-sm text-muted-foreground">{ui.companyReport.unresolvedWarning}</p>
          {preview.suggestions.length > 0 ? (
            <ul className="mt-4 divide-y border-y">
              {preview.suggestions.map((candidate) => (
                <li key={candidate.domain || candidate.name} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">{candidate.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[candidate.country, candidate.domain].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => startResearch({ selectedDomain: candidate.domain, query: candidate.name })}
                  >
                    Selecionar
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 rounded-md border px-4 py-3 text-sm">
            <p className="font-medium">{companyName.trim()}</p>
            <p className="mt-1 text-muted-foreground">
              {[country.trim() || null, website.trim() || null].filter(Boolean).join(" · ") || "Sem website informado"}
            </p>
          </div>
          <Button
            type="button"
            variant="brand"
            className="mt-4"
            disabled={pending}
            onClick={() =>
              startResearch({
                confirmUnresolved: true,
                selectedDomain: website.trim() ? normalizeDomain(website) : undefined,
              })
            }
          >
            {ui.companyReport.continueAnyway}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
