"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefineAnalysisDialog } from "@/components/workspace/refine-analysis-dialog";
import { t, ui } from "@/i18n";

interface OpportunityActionsProps {
  opportunityTitle: string;
  companySlug: string;
}

/** Local-only interactions. No persistence in this prototype. */
export function OpportunityActions({ opportunityTitle, companySlug }: OpportunityActionsProps) {
  const [refineOpen, setRefineOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">{ui.opportunities.markedIrrelevant}</span>
        <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setDismissed(false)}>
          {ui.opportunities.undo}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
        {ui.opportunities.notRelevant}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setRefineOpen(true)}>
        {ui.opportunities.refine}
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={() => setRefineOpen(true)}
        aria-label={t(ui.opportunities.investigateAria, { title: opportunityTitle })}
      >
        {ui.opportunities.investigate}
      </Button>
      <RefineAnalysisDialog companySlug={companySlug} open={refineOpen} onOpenChange={setRefineOpen} />
    </div>
  );
}
