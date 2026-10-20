"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { startExternalResearchAction } from "@/server/actions/external-research-actions";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";

interface WorkspaceActionsProps {
  companySlug: string;
  companyName?: string;
}

/** Header actions for company workspace — download report + update research. */
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

  function handleDownload() {
    window.print();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={handleDownload}>
        <Download data-icon="inline-start" />
        {ui.workspace.downloadReport}
      </Button>
      <Button type="button" variant="brand" onClick={() => void handleUpdate()} disabled={updating}>
        <RefreshCw data-icon="inline-start" />
        {ui.companyReport.updateResearch}
      </Button>
    </div>
  );
}
