"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { processSignalExtractionAction } from "@/server/actions/signal-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import type { SignalCandidateView, SignalExtractionSummary } from "@/server/signals/types";

const copy = ui.admin.signalLab;
const extractionCopy = ui.admin.extractionLab;

interface SignalLabFormProps {
  companies: { id: string; displayName: string; slug: string }[];
  analyses: { id: string; title: string; status: string; companyId: string }[];
  runsByAnalysis: Record<string, { id: string; status: string; createdAt: string }[]>;
  claimsByAnalysis: Record<string, { id: string; statement: string; assertionMode: string }[]>;
  existingCandidates: SignalCandidateView[];
  openaiConfigured: boolean;
}

export function SignalLabForm({
  companies,
  analyses,
  runsByAnalysis,
  claimsByAnalysis,
  existingCandidates,
  openaiConfigured,
}: SignalLabFormProps) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const companyAnalyses = useMemo(
    () => analyses.filter((analysis) => analysis.companyId === companyId),
    [analyses, companyId],
  );
  const [analysisId, setAnalysisId] = useState(companyAnalyses[0]?.id ?? "");
  const runs = useMemo(() => runsByAnalysis[analysisId] ?? [], [analysisId, runsByAnalysis]);
  const claims = useMemo(() => claimsByAnalysis[analysisId] ?? [], [analysisId, claimsByAnalysis]);
  const [researchRunId, setResearchRunId] = useState(runs[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SignalExtractionSummary | null>(null);

  function onCompanyChange(value: string) {
    setCompanyId(value);
    const nextAnalyses = analyses.filter((analysis) => analysis.companyId === value);
    const nextAnalysisId = nextAnalyses[0]?.id ?? "";
    setAnalysisId(nextAnalysisId);
    setResearchRunId(runsByAnalysis[nextAnalysisId]?.[0]?.id ?? "");
  }

  function onAnalysisChange(value: string) {
    setAnalysisId(value);
    setResearchRunId(runsByAnalysis[value]?.[0]?.id ?? "");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      setError(null);
      const result = await processSignalExtractionAction(formData);
      if (result.ok) setSummary(result.summary);
      else setError(result.error);
    });
  }

  if (companies.length === 0) {
    return <p className="text-sm text-muted-foreground">{copy.noCompanies}</p>;
  }

  const candidates = summary?.candidates ?? existingCandidates;

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm">
        <Link href={routes.extractionLab} className="underline underline-offset-4">
          {ui.admin.knowledgeLab.reuseExtraction}
        </Link>
      </p>
      <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{copy.livePending}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-lg border bg-card p-6">
        <input type="hidden" name="companyId" value={companyId} />
        <div className="grid gap-2">
          <Label htmlFor="companyIdSelect">{copy.company}</Label>
          <select
            id="companyIdSelect"
            value={companyId}
            onChange={(event) => onCompanyChange(event.target.value)}
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
            onChange={(event) => onAnalysisChange(event.target.value)}
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
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{extractionCopy.noRuns}</p>
          ) : (
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
          )}
        </div>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">{copy.claims}</legend>
          {claims.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.noClaims}</p>
          ) : (
            claims.map((claim) => (
              <label key={claim.id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="claimIds" value={claim.id} defaultChecked className="mt-1" />
                <span>
                  {claim.statement}{" "}
                  <span className="text-xs text-muted-foreground">({claim.assertionMode})</span>
                </span>
              </label>
            ))
          )}
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="useFakeProvider" value="true" defaultChecked={!openaiConfigured} />
          {copy.useFake}
        </label>
        <p className="text-xs text-muted-foreground">{copy.fakeHint}</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending || runs.length === 0 || claims.length === 0}>
          {pending ? copy.processing : copy.submit}
        </Button>
      </form>
      {summary && (
        <p className="text-sm text-muted-foreground">
          {copy.parsed}: {summary.claimCount} claims · {summary.candidateCount} {copy.candidates} ·{" "}
          {summary.promotedCount} {extractionCopy.promoted} · {summary.needsReviewCount} {extractionCopy.needsReview} ·{" "}
          {summary.rejectedCount} {extractionCopy.rejected} · {summary.signalCount} {copy.signals}
        </p>
      )}
      {candidates.length > 0 && <CandidateList candidates={candidates} />}
    </div>
  );
}

function CandidateList({ candidates }: { candidates: SignalCandidateView[] }) {
  return (
    <section className="rounded-lg border bg-card p-6">
      <h2 className="text-sm font-medium">{extractionCopy.inspect}</h2>
      <div className="mt-6 flex flex-col gap-4">
        {candidates.map((candidate) => (
          <article key={candidate.id} className="rounded-md border px-4 py-3">
            <p className="text-sm font-medium">
              {candidate.title}{" "}
              <span className="text-xs text-muted-foreground">({candidate.signalType})</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{candidate.summary}</p>
            <dl className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <div>
                {extractionCopy.status}: {candidate.status}
              </div>
              <div>
                {ui.signals.assertionMode}: {candidate.assertionMode}
              </div>
              <div>
                {extractionCopy.originRun}: <span className="font-mono">{candidate.originModelRunId}</span>
              </div>
              {candidate.rejectionReasonText && (
                <div>
                  {extractionCopy.reason}: {candidate.rejectionReasonCode} — {candidate.rejectionReasonText}
                </div>
              )}
            </dl>
            <ul className="mt-2 space-y-1 text-xs">
              {candidate.validations.map((row) => (
                <li key={`${row.validatorCode}-${row.result}-${row.message}`}>
                  {row.validatorCode}: {row.result}/{row.severity}
                  {row.message ? ` — ${row.message}` : ""}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
