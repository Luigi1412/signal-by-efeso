"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { startExternalResearchAction } from "@/server/actions/external-research-actions";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";

interface WorkspaceActionsProps {
  companySlug: string;
  companyName?: string;
}

/** Header actions for company workspace — update research only. */
export function WorkspaceActions({ companySlug, companyName }: WorkspaceActionsProps) {
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  async function handleUpdate() {
    setUpdating(true);
    const result = await startExternalResearchAction({
      query: companyName || companySlug,
      existingSlug: companySlug,
    });
    if (result.ok) router.push(routes.research(result.runId));
    setUpdating(false);
  }

  return (
    <Button variant="brand" onClick={() => void handleUpdate()} disabled={updating}>
      <RefreshCw data-icon="inline-start" />
      {ui.companyReport.updateResearch}
    </Button>
  );
}
