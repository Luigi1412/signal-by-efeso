"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";
import { cancelExternalResearchAction, tickExternalResearchAction } from "@/server/actions/external-research-actions";
import type { ExternalResearchRunRow, ExternalSourceCandidateRow } from "@/server/external-research/types";

export function AdminResearchLab(props: {
  runs: ExternalResearchRunRow[];
  eventsByRun: Record<string, { event_type: string; payload: Record<string, unknown>; created_at: string }[]>;
  sourcesByRun: Record<string, ExternalSourceCandidateRow[]>;
}) {
  const [pending, startTransition] = useTransition();
  const [runs, setRuns] = useState(props.runs);

  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">{ui.admin.researchLab.empty}</p>;
  }

  return (
    <ul className="space-y-4">
      {runs.map((run) => {
        const sources = props.sourcesByRun[run.id] ?? [];
        const events = props.eventsByRun[run.id] ?? [];
        return (
          <li key={run.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{run.requested_query}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {run.status} · fontes {run.source_count} · aceitas {run.accepted_source_count} · rejeitadas {run.rejected_source_count}
                </p>
                {run.failure_reason ? <p className="mt-1 text-xs text-conflict">{run.failure_reason}</p> : null}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await tickExternalResearchAction(run.id);
                      if (result.ok) {
                        setRuns((current) =>
                          current.map((item) => (item.id === run.id ? { ...item, status: result.run.status } : item)),
                        );
                      }
                    });
                  }}
                >
                  {ui.admin.researchLab.retry}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      await cancelExternalResearchAction(run.id);
                      setRuns((current) => current.map((item) => (item.id === run.id ? { ...item, status: "cancelled" } : item)));
                    });
                  }}
                >
                  {ui.admin.researchLab.cancel}
                </Button>
              </div>
            </div>
            {sources.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {sources.slice(0, 12).map((source) => (
                  <li key={source.id}>
                    {source.status} · {source.source_quality} · {source.publisher} · {source.url}
                  </li>
                ))}
              </ul>
            ) : null}
            {events.length > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Eventos: {events.map((event) => event.event_type).join(" → ")}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
