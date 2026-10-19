"use client";

import { useMemo, useState, useTransition } from "react";
import { processRecommendedActionLab } from "@/server/actions/recommended-action-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ui } from "@/i18n";
import type { RecommendedActionCandidateView, RecommendedActionSummary } from "@/server/recommended-actions/types";

const copy = ui.admin.actionLab;
const signalCopy = ui.admin.signalLab;
const extractionCopy = ui.admin.extractionLab;

export function ActionLabForm({
  companies,
  analyses,
  runsByAnalysis,
  existingCandidates,
  opportunityTitles,
  relationshipSummary,
  openaiConfigured,
}: {
  companies: { id: string; displayName: string; slug: string }[];
  analyses: { id: string; title: string; status: string; companyId: string }[];
  runsByAnalysis: Record<string, { id: string; status: string; createdAt: string }[]>;
  existingCandidates: RecommendedActionCandidateView[];
  opportunityTitles: string[];
  relationshipSummary: string;
  openaiConfigured: boolean;
}) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const companyAnalyses = useMemo(
    () => analyses.filter((analysis) => analysis.companyId === companyId),
    [analyses, companyId],
  );
  const [analysisId, setAnalysisId] = useState(companyAnalyses[0]?.id ?? "");
  const runs = useMemo(() => runsByAnalysis[analysisId] ?? [], [analysisId, runsByAnalysis]);
  const [researchRunId, setResearchRunId] = useState(runs[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RecommendedActionSummary | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      setError(null);
      const result = await processRecommendedActionLab(formData);
      if (result.ok) setSummary(result.summary);
      else setError(result.error);
    });
  }

  const candidates = summary?.candidates ?? existingCandidates;

  return (
    <div className="flex flex-col gap-8">
      <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{signalCopy.livePending}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-lg border bg-card p-6">
        <input type="hidden" name="companyId" value={companyId} />
        <div className="grid gap-2">
          <Label>{signalCopy.company}</Label>
          <select
            value={companyId}
            onChange={(event) => {
              const value = event.target.value;
              setCompanyId(value);
              const next = analyses.filter((analysis) => analysis.companyId === value);
              setAnalysisId(next[0]?.id ?? "");
              setResearchRunId(runsByAnalysis[next[0]?.id ?? ""]?.[0]?.id ?? "");
            }}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="analysisId">{extractionCopy.analysis}</Label>
          <select
            id="analysisId"
            name="analysisId"
            value={analysisId}
            onChange={(event) => {
              setAnalysisId(event.target.value);
              setResearchRunId(runsByAnalysis[event.target.value]?.[0]?.id ?? "");
            }}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            {companyAnalyses.map((analysis) => (
              <option key={analysis.id} value={analysis.id}>
                {analysis.title} ({analysis.status})
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="researchRunId">{extractionCopy.researchRun}</Label>
          <select
            id="researchRunId"
            name="researchRunId"
            value={researchRunId}
            onChange={(event) => setResearchRunId(event.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            {runs.map((run) => (
              <option key={run.id} value={run.id}>
                {run.id} · {run.status}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="useFakeProvider" value="true" defaultChecked={!openaiConfigured} />
          {signalCopy.useFake}
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending || runs.length === 0}>
          {pending ? copy.processing : copy.submit}
        </Button>
      </form>
      <section className="rounded-lg border bg-card p-6 text-sm">
        <p className="font-medium">{ui.opportunities.title}</p>
        <ul className="mt-2 list-disc pl-5 text-muted-foreground">
          {opportunityTitles.map((title) => (
            <li key={title}>{title}</li>
          ))}
        </ul>
        <p className="mt-4 font-medium">{ui.relationship.title}</p>
        <p className="mt-1 text-muted-foreground">{relationshipSummary}</p>
      </section>
      {candidates.length > 0 ? (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-sm font-medium">{extractionCopy.inspect}</h2>
          <div className="mt-4 flex flex-col gap-4">
            {candidates.map((candidate) => (
              <article key={candidate.id} className="rounded-md border px-4 py-3">
                <p className="text-sm font-medium">{candidate.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{candidate.rationale}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {extractionCopy.status}: {candidate.status} · {candidate.actionType} · {candidate.priority}
                </p>
                <ul className="mt-2 space-y-1 text-xs">
                  {candidate.validations.map((row) => (
                    <li key={`${row.validatorCode}-${row.result}`}>
                      {row.validatorCode}: {row.result}/{row.severity}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
