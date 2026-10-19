"use client";

import { useMemo, useState, useTransition } from "react";
import { processControlledDocumentAction } from "@/server/actions/extraction-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ui } from "@/i18n";
import type { ControlledExtractionSummary } from "@/types/controlled-extraction";

const copy = ui.admin.extractionLab;

interface ExtractionLabFormProps {
  analyses: { id: string; title: string; status: string }[];
  runsByAnalysis: Record<string, { id: string; status: string; createdAt: string }[]>;
}

export function ExtractionLabForm({ analyses, runsByAnalysis }: ExtractionLabFormProps) {
  const [analysisId, setAnalysisId] = useState(analyses[0]?.id ?? "");
  const runs = useMemo(() => runsByAnalysis[analysisId] ?? [], [analysisId, runsByAnalysis]);
  const [researchRunId, setResearchRunId] = useState(runs[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ControlledExtractionSummary | null>(null);

  function onAnalysisChange(value: string) {
    setAnalysisId(value);
    setResearchRunId(runsByAnalysis[value]?.[0]?.id ?? "");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      setError(null);
      const result = await processControlledDocumentAction(formData);
      if (result.ok) setSummary(result.summary);
      else setError(result.error);
    });
  }

  if (analyses.length === 0) {
    return <p className="text-sm text-muted-foreground">{copy.noAnalyses}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-lg border bg-card p-6">
        <div className="grid gap-2">
          <Label htmlFor="analysisId">{copy.analysis}</Label>
          <select
            id="analysisId"
            name="analysisId"
            value={analysisId}
            onChange={(event) => onAnalysisChange(event.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            {analyses.map((analysis) => (
              <option key={analysis.id} value={analysis.id}>
                {analysis.title} ({analysis.status})
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="researchRunId">{copy.researchRun}</Label>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.noRuns}</p>
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
        <div className="grid gap-2">
          <Label htmlFor="publisherName">{copy.publisher}</Label>
          <Input id="publisherName" name="publisherName" required defaultValue="Signal synthetic fixture" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sourceType">{copy.sourceType}</Label>
          <select id="sourceType" name="sourceType" defaultValue="other" className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="other">other</option>
            <option value="annual_report">annual_report</option>
            <option value="corporate_press_release">corporate_press_release</option>
            <option value="investor_presentation">investor_presentation</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sourceTier">{copy.sourceTier}</Label>
          <select id="sourceTier" name="sourceTier" defaultValue="B" className="h-9 rounded-md border bg-background px-3 text-sm">
            {["A", "B", "C", "D", "E"].map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="canonicalUrl">{copy.canonicalUrl}</Label>
          <Input id="canonicalUrl" name="canonicalUrl" type="url" placeholder="https://example.invalid/..." />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="file">{copy.file}</Label>
          <Input id="file" name="file" type="file" accept=".txt,.pdf,text/plain,application/pdf" required />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending || runs.length === 0}>
          {pending ? copy.processing : copy.submit}
        </Button>
      </form>

      {summary && <ExtractionSummaryCard summary={summary} />}
    </div>
  );
}

function ExtractionSummaryCard({ summary }: { summary: ControlledExtractionSummary }) {
  return (
    <section className="rounded-lg border bg-card p-6">
      <h2 className="text-sm font-medium">{copy.parsed}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {summary.blockCount} {copy.blocks} · {summary.windowCount} {copy.windows} · {summary.candidateCount}{" "}
        {copy.candidates} · {summary.promotedCount} {copy.promoted} · {summary.needsReviewCount} {copy.needsReview} ·{" "}
        {summary.rejectedCount} {copy.rejected}
      </p>
      <div className="mt-6 flex flex-col gap-4">
        <h3 className="eyebrow">{copy.inspect}</h3>
        {summary.candidates.map((candidate) => (
          <article key={candidate.id} className="rounded-md border px-4 py-3">
            <p className="text-sm font-medium">{candidate.statement}</p>
            <dl className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <div>
                {copy.status}: {candidate.status} ·{" "}
                {ui.assertionMode[candidate.assertionMode as keyof typeof ui.assertionMode] ??
                  candidate.assertionMode}
              </div>
              <div>
                {copy.originRun}: <span className="font-mono">{candidate.originModelRunId}</span>
              </div>
              {candidate.rejectionReasonText && (
                <div>
                  {copy.reason}: {candidate.rejectionReasonCode} — {candidate.rejectionReasonText}
                </div>
              )}
            </dl>
            {candidate.citations.map((citation) => (
              <blockquote key={`${citation.exactQuote}-${citation.pageNumber}`} className="mt-2 border-l-2 pl-3 text-sm">
                {citation.exactQuote}
                {(citation.pageNumber || citation.sectionTitle) && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {citation.pageNumber ? `${copy.page} ${citation.pageNumber}` : null}
                    {citation.sectionTitle ? ` · ${citation.sectionTitle}` : null}
                  </div>
                )}
              </blockquote>
            ))}
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
