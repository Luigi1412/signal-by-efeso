"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { findCompanyByName } from "@/data";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { startAnalysisAction } from "@/server/actions/analysis-actions";
import type { ResearchFocus } from "@/types";

const researchFocusOptions = Object.keys(ui.researchFocus) as ResearchFocus[];
const geographyOptions = ["Brazil", "Latin America", "Global"] as const;

function routeUnknownOrMock(query: string): string {
  const match = findCompanyByName(query);
  if (!match) return `${routes.analysisUnavailable}?q=${encodeURIComponent(query)}`;
  return routes.analysisResolve(match.slug);
}

export function NewAnalysisForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [geography, setGeography] = useState<(typeof geographyOptions)[number]>("Brazil");
  const [focus, setFocus] = useState<ResearchFocus>("General EFESO opportunity scan");
  const [instructions, setInstructions] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = companyName.trim().length > 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!isValid) return;
    const value = companyName.trim();

    startTransition(async () => {
      setError(null);
      const result = await startAnalysisAction({
        companyQuery: value,
        website: website.trim() || undefined,
        geography,
        focus,
        additionalInstructions: instructions.trim() || undefined,
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
        router.push(routeUnknownOrMock(value));
        return;
      }
      setError(ui.persistence.startFailed);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <div className="flex flex-col gap-6 rounded-lg border bg-card p-6">
        <div className="grid gap-2">
          <Label htmlFor="company-name">
            {ui.newAnalysis.companyName} <span className="text-brand">*</span>
          </Label>
          <Input
            id="company-name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="ex.: Natura"
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

        <div className="grid gap-2">
          <Label htmlFor="company-website">
            {ui.newAnalysis.website} <span className="font-normal text-muted-foreground">{ui.newAnalysis.optional}</span>
          </Label>
          <Input
            id="company-website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="empresa.com.br"
            inputMode="url"
            autoComplete="off"
            className="h-10"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="geography">{ui.newAnalysis.geography}</Label>
            <Select
              value={geography}
              onValueChange={(value) => {
                if (geographyOptions.includes(value as (typeof geographyOptions)[number])) {
                  setGeography(value as (typeof geographyOptions)[number]);
                }
              }}
            >
              <SelectTrigger id="geography" className="h-10! w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {geographyOptions.map((g) => (
                  <SelectItem key={g} value={g}>
                    {ui.geography[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="focus">{ui.newAnalysis.focus}</Label>
            <Select value={focus} onValueChange={(v) => setFocus(v as ResearchFocus)}>
              <SelectTrigger id="focus" className="h-10! w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {researchFocusOptions.map((f) => (
                  <SelectItem key={f} value={f}>
                    {ui.researchFocus[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="instructions">
            {ui.newAnalysis.instructions} <span className="font-normal text-muted-foreground">{ui.newAnalysis.optional}</span>
          </Label>
          <Textarea
            id="instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={ui.newAnalysis.instructionsPlaceholder}
            rows={4}
            className="min-h-24 resize-y"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className={`text-xs ${error ? "text-conflict" : "text-muted-foreground"}`}>{error ?? ui.newAnalysis.hint}</p>
        <Button type="submit" variant="brand" size="lg" className="h-10 px-4" disabled={pending}>
          {ui.newAnalysis.cta}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </form>
  );
}
