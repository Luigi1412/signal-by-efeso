"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import {
  previewExternalResearchAction,
  startExternalResearchAction,
  type PreviewResearchResult,
} from "@/server/actions/external-research-actions";

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

export function NewResearchForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("Brasil");
  const [instructions, setInstructions] = useState("");
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
      const result = await previewExternalResearchAction({
        query: companyName.trim(),
        country: normalizeCountry(country),
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
      const result = await startExternalResearchAction({
        query: extra.query ?? companyName.trim(),
        country: normalizeCountry(country),
        existingSlug: extra.existingSlug,
        selectedDomain: domain,
        confirmUnresolved: extra.confirmUnresolved,
        instructions: instructions.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(routes.research(result.runId));
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <div className="grid gap-2">
          <Label htmlFor="company-name">
            {ui.newAnalysis.companyName} <span className="text-brand">*</span>
          </Label>
          <Input
            id="company-name"
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              setPreview(null);
            }}
            placeholder="Klabin"
            autoComplete="off"
            aria-invalid={touched && !isValid}
            className="h-10 text-base md:text-[15px]"
            autoFocus
          />
          {touched && !isValid ? (
            <p className="text-xs text-conflict">{ui.newAnalysis.companyNameError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{ui.newAnalysis.companyNameHint}</p>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
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

        <div className="grid gap-2">
          <Label htmlFor="instructions">
            {ui.newAnalysis.instructions}{" "}
            <span className="font-normal text-muted-foreground">{ui.newAnalysis.optional}</span>
          </Label>
          <Textarea
            id="instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={ui.newAnalysis.instructionsPlaceholder}
            rows={3}
            className="min-h-20 resize-y"
          />
        </div>

        <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className={`text-xs ${error ? "text-conflict" : "text-muted-foreground"}`}>{error ?? ui.newAnalysis.hint}</p>
          <Button type="submit" variant="brand" size="lg" className="h-10 px-4" disabled={pending}>
            {ui.newAnalysis.cta}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </form>

      {preview?.kind === "existing" ? (
        <div className="border-t pt-6">
          <p className="text-sm font-medium">{ui.companyReport.confirmCompany}</p>
          <p className="mt-2 text-base font-semibold">{preview.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {[preview.country, preview.industry, preview.domain].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="brand" disabled={pending} onClick={() => router.push(routes.company(preview.slug))}>
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
        <div className="border-t pt-6">
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
        <div className="border-t pt-6">
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
        <div className="border-t pt-6">
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
