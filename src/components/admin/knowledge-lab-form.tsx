"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { processKnowledgeSnapshotAction } from "@/server/actions/knowledge-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import type { KnowledgeExtractionSummary } from "@/types/efeso-knowledge";

const copy = ui.admin.knowledgeLab;
const extractionCopy = ui.admin.extractionLab;

interface KnowledgeLabFormProps {
  analyses: { id: string; title: string; status: string }[];
  runsByAnalysis: Record<string, { id: string; status: string; createdAt: string }[]>;
  snapshots: { id: string; title: string | null; capturedAt: string; sourceId: string }[];
}

export function KnowledgeLabForm({ analyses, runsByAnalysis, snapshots }: KnowledgeLabFormProps) {
  const [analysisId, setAnalysisId] = useState(analyses[0]?.id ?? "");
  const runs = useMemo(() => runsByAnalysis[analysisId] ?? [], [analysisId, runsByAnalysis]);
  const [researchRunId, setResearchRunId] = useState(runs[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<KnowledgeExtractionSummary | null>(null);

  function onAnalysisChange(value: string) {
    setAnalysisId(value);
    setResearchRunId(runsByAnalysis[value]?.[0]?.id ?? "");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      setError(null);
      const result = await processKnowledgeSnapshotAction(formData);
      if (result.ok) setSummary(result.summary);
      else setError(result.error);
    });
  }

  if (analyses.length === 0) {
    return <p className="text-sm text-muted-foreground">{extractionCopy.noAnalyses}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm">
        <Link href={routes.extractionLab} className="underline underline-offset-4">
          {copy.reuseExtraction}
        </Link>
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-lg border bg-card p-6">
        <div className="grid gap-2">
          <Label htmlFor="analysisId">{extractionCopy.analysis}</Label>
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
        <div className="grid gap-2">
          <Label htmlFor="sourceSnapshotId">{copy.snapshot}</Label>
          {snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.noSnapshots}</p>
          ) : (
            <select id="sourceSnapshotId" name="sourceSnapshotId" className="h-9 rounded-md border bg-background px-3 text-sm">
              {snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {(snapshot.title ?? snapshot.id) + " · " + snapshot.id}
                </option>
              ))}
            </select>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending || runs.length === 0 || snapshots.length === 0}>
          {pending ? copy.processing : copy.submit}
        </Button>
      </form>
      {summary && <KnowledgeSummaryCard summary={summary} />}
    </div>
  );
}

function KnowledgeSummaryCard({ summary }: { summary: KnowledgeExtractionSummary }) {
  return (
    <section className="rounded-lg border bg-card p-6">
      <h2 className="text-sm font-medium">{copy.parsed}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {summary.blockCount} {extractionCopy.blocks} · {summary.windowCount} {extractionCopy.windows} ·{" "}
        {summary.candidateCount} {copy.candidates} · {summary.promotedCount} {extractionCopy.promoted} ·{" "}
        {summary.needsReviewCount} {extractionCopy.needsReview} · {summary.rejectedCount} {extractionCopy.rejected} ·{" "}
        {summary.objectCount} {copy.objects}
      </p>
      <div className="mt-6 flex flex-col gap-4">
        <h3 className="eyebrow">{extractionCopy.inspect}</h3>
        {summary.candidates.map((candidate) => (
          <article key={candidate.id} className="rounded-md border px-4 py-3">
            <p className="text-sm font-medium">
              {candidate.canonicalName}{" "}
              <span className="text-xs text-muted-foreground">({candidate.objectType})</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{candidate.description}</p>
            <dl className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <div>
                {extractionCopy.status}: {candidate.status}
              </div>
              <div>
                {extractionCopy.originRun}: <span className="font-mono">{candidate.originModelRunId}</span>
              </div>
              {candidate.rejectionReasonText && (
                <div>
                  {extractionCopy.reason}: {candidate.rejectionReasonCode} — {candidate.rejectionReasonText}
                </div>
              )}
              <div>
                {copy.tags}: {JSON.stringify(candidate.proposedTags)}
              </div>
              <div>
                {copy.relations}: {JSON.stringify(candidate.proposedRelations)}
              </div>
            </dl>
            {candidate.citations.map((citation) => (
              <blockquote key={`${citation.exactQuote}-${citation.pageNumber}`} className="mt-2 border-l-2 pl-3 text-sm">
                {citation.exactQuote}
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
