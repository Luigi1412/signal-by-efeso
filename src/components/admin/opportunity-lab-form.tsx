"use client";

import { useMemo, useState, useTransition } from "react";
import { processOpportunityAction } from "@/server/actions/opportunity-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ui } from "@/i18n";
import type { OpportunityCandidateView, OpportunityLabCompanyContext, OpportunitySummary } from "@/server/opportunities/types";

const copy = ui.admin.opportunityLab;
const signalCopy = ui.admin.signalLab;
const extractionCopy = ui.admin.extractionLab;

interface OpportunityLabFormProps {
  companies: { id: string; displayName: string; slug: string }[];
  analyses: { id: string; title: string; status: string; companyId: string }[];
  runsByAnalysis: Record<string, { id: string; status: string; createdAt: string }[]>;
  existingByCompany: Record<string, OpportunityCandidateView[]>;
  contexts: Record<string, OpportunityLabCompanyContext>;
  openaiConfigured: boolean;
}

export function OpportunityLabForm({
  companies,
  analyses,
  runsByAnalysis,
  existingByCompany,
  contexts,
  openaiConfigured,
}: OpportunityLabFormProps) {
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
  const [summary, setSummary] = useState<OpportunitySummary | null>(null);

  function onCompanyChange(value: string) {
    setCompanyId(value);
    const nextAnalyses = analyses.filter((analysis) => analysis.companyId === value);
    const nextAnalysisId = nextAnalyses[0]?.id ?? "";
    setAnalysisId(nextAnalysisId);
    setResearchRunId(runsByAnalysis[nextAnalysisId]?.[0]?.id ?? "");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      setError(null);
      const result = await processOpportunityAction(formData);
      if (result.ok) setSummary(result.summary);
      else setError(result.error);
    });
  }

  if (companies.length === 0) {
    return <p className="text-sm text-muted-foreground">{signalCopy.noCompanies}</p>;
  }

  const companyContext = contexts[companyId];
  const candidates =
    summary && summary.companyId === companyId ? summary.candidates : (existingByCompany[companyId] ?? []);

  return (
    <div className="flex flex-col gap-8">
      <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{signalCopy.livePending}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-lg border bg-card p-6">
        <input type="hidden" name="companyId" value={companyId} />
        <div className="grid gap-2">
          <Label htmlFor="companyIdSelect">{signalCopy.company}</Label>
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
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="useFakeProvider" value="true" defaultChecked={!openaiConfigured} />
          {signalCopy.useFake}
        </label>
        <p className="text-xs text-muted-foreground">{signalCopy.fakeHint}</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending || runs.length === 0}>
          {pending ? copy.processing : copy.submit}
        </Button>
      </form>
      {companyContext ? (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-sm font-medium">{copy.contextTitle}</h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-3">
            <div>
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{copy.accountIntelligence}</h3>
              {companyContext.accountIntelligence ? (
                <div className="mt-2 space-y-1 text-sm">
                  <p className="font-medium">{companyContext.accountIntelligence.headline}</p>
                  <p className="text-muted-foreground">{companyContext.accountIntelligence.status}</p>
                  <p className="text-muted-foreground">{companyContext.accountIntelligence.summary}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">{copy.noIntelligence}</p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{copy.activeSignals}</h3>
              {companyContext.signals.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">{copy.noSignals}</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {companyContext.signals.map((signal) => (
                    <li key={signal.id}>
                      {signal.title} · {signal.signalType} · {signal.status}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{copy.activeFits}</h3>
              {companyContext.fits.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">{copy.noFits}</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {companyContext.fits.map((fit) => (
                    <li key={fit.id}>
                      {fit.knowledgeName} · {fit.fitLevel} · {fit.status}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      ) : null}
      {summary && (
        <p className="text-sm text-muted-foreground">
          {copy.parsed}: {summary.signalCount} {signalCopy.signals} · {summary.fitCount} {copy.fits} ·{" "}
          {summary.candidateCount} {copy.candidates} · {summary.promotedCount} {extractionCopy.promoted} ·{" "}
          {summary.needsReviewCount} {extractionCopy.needsReview} · {summary.rejectedCount} {extractionCopy.rejected}
        </p>
      )}
      {candidates.length > 0 && (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-sm font-medium">{extractionCopy.inspect}</h2>
          <div className="mt-6 flex flex-col gap-4">
            {candidates.map((candidate) => (
              <article key={candidate.id} className="rounded-md border px-4 py-3">
                <p className="text-sm font-medium">{candidate.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{candidate.summary}</p>
                <dl className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  <div>
                    {extractionCopy.status}: {candidate.status}
                  </div>
                  <div>
                    {candidate.opportunityType} · {candidate.relevanceLevel}/{candidate.urgencyLevel}/{candidate.maturity} ·{" "}
                    {candidate.confidenceTier}
                  </div>
                  <div>
                    {copy.rationale}: {candidate.rationale}
                  </div>
                  <div>
                    {copy.fingerprint}: {candidate.fingerprint}
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
      )}
    </div>
  );
}
