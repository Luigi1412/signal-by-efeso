"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ui } from "@/i18n";
import { knowledgeTypeLabel } from "@/lib/knowledge-display";
import { opportunityLevelLabel } from "@/lib/opportunity-display";
import { routes } from "@/lib/routes";
import type { EfesoFitView } from "@/server/intelligence/types";

const copy = ui.relevantKnowledge;

interface RelevantEfesoKnowledgeProps {
  fits: EfesoFitView[];
  companySlug: string;
}

export function RelevantEfesoKnowledge({ fits, companySlug }: RelevantEfesoKnowledgeProps) {
  const [selected, setSelected] = useState<EfesoFitView | null>(null);

  if (fits.length === 0) {
    return <p className="text-sm text-muted-foreground">{copy.empty}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        {fits.map((fit) => (
          <article key={fit.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium">{fit.knowledgeName}</h3>
              <Badge variant="secondary">
                {copy.fitLevel}: {opportunityLevelLabel(fit.fitLevel)}
              </Badge>
              <Badge variant="outline">{knowledgeTypeLabel(fit.knowledgeType)}</Badge>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{fit.fitReasonSummary}</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setSelected(fit)}>
              {copy.matchedBecause}
            </Button>
          </article>
        ))}
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selected?.knowledgeName}</SheetTitle>
            <SheetDescription>{copy.provenance}</SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="mt-4 flex flex-col gap-4 text-sm">
              <p>
                {copy.fitLevel}: {selected.fitLevel}
              </p>
              <div>
                <p className="font-medium">{copy.matchedBecause}</p>
                <ul className="mt-2 space-y-2">
                  {selected.components.map((component) => (
                    <li key={`${component.componentType}-${component.componentValue}`} className="rounded-md border px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        {component.componentType} · {component.sourceType}
                      </p>
                      <p>{component.explanation}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium">{copy.supportingSignals}</p>
                <ul className="mt-2 space-y-1">
                  {selected.relatedSignals.map((signal) => (
                    <li key={`${signal.id}-${signal.matchType}`}>
                      <Link
                        className="underline underline-offset-4"
                        href={`${routes.companyTab(companySlug, "signals")}?signal=${encodeURIComponent(signal.id)}`}
                      >
                        {signal.title}
                      </Link>{" "}
                      <span className="text-xs text-muted-foreground">
                        ({signal.matchType} · {signal.matchStrength})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {selected.relatedProblems.length > 0 ? (
                <div>
                  <p className="font-medium">{copy.relatedProblems}</p>
                  <ul className="mt-2 list-disc pl-4">
                    {selected.relatedProblems.map((item) => (
                      <li key={item.id}>{item.name}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {selected.relatedCapabilities.length > 0 ? (
                <div>
                  <p className="font-medium">{copy.relatedCapabilities}</p>
                  <ul className="mt-2 list-disc pl-4">
                    {selected.relatedCapabilities.map((item) => (
                      <li key={item.id}>{item.name}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {selected.relatedMethodologies.length > 0 ? (
                <div>
                  <p className="font-medium">{copy.relatedMethodologies}</p>
                  <ul className="mt-2 list-disc pl-4">
                    {selected.relatedMethodologies.map((item) => (
                      <li key={item.id}>{item.name}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {selected.relatedIndustries.length > 0 ? (
                <div>
                  <p className="font-medium">{copy.relatedIndustries}</p>
                  <ul className="mt-2 list-disc pl-4">
                    {selected.relatedIndustries.map((item) => (
                      <li key={item.id}>{item.name}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {selected.relatedCases.length > 0 ? (
                <div>
                  <p className="font-medium">{copy.relatedCases}</p>
                  <ul className="mt-2 list-disc pl-4">
                    {selected.relatedCases.map((item) => (
                      <li key={item.id}>{item.name}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {selected.relatedResults.length > 0 ? (
                <div>
                  <p className="font-medium">{copy.relatedResults}</p>
                  <ul className="mt-2 list-disc pl-4">
                    {selected.relatedResults.map((item) => (
                      <li key={item.id}>{item.name}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">{copy.noMagicScore}</p>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
