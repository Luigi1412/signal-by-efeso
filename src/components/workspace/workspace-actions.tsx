"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Download, RefreshCw, SlidersHorizontal } from "lucide-react";
import { startExternalResearchAction } from "@/server/actions/external-research-actions";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { RefineAnalysisDialog } from "./refine-analysis-dialog";

interface WorkspaceActionsProps {
  companySlug: string;
  downloadLabel?: string;
}

/** Header actions: Refine Analysis and client-side print/PDF. */
export function WorkspaceActions({ companySlug, downloadLabel }: WorkspaceActionsProps) {
  const [refineOpen, setRefineOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const label = downloadLabel ?? ui.workspace.downloadReport;
  const reportPath = routes.companyTab(companySlug, "report");

  async function handleUpdate() {
    setUpdating(true);
    const result = await startExternalResearchAction({ query: companySlug, existingSlug: companySlug });
    if (result.ok) router.push(routes.research(result.runId));
    setUpdating(false);
  }

  function handleDownload() {
    const onReport = pathname === reportPath || pathname.startsWith(`${reportPath}/`);
    if (onReport) {
      window.print();
      return;
    }
    router.push(`${reportPath}?print=1`);
  }

  return (
    <>
      <Button variant="outline" onClick={handleDownload}>
        <Download data-icon="inline-start" />
        {label}
      </Button>
      <Button variant="outline" onClick={() => void handleUpdate()} disabled={updating}>
        <RefreshCw data-icon="inline-start" />
        {ui.workspace.updateAnalysis}
      </Button>
      <Button variant="brand" onClick={() => setRefineOpen(true)}>
        <SlidersHorizontal data-icon="inline-start" />
        {ui.workspace.refine}
      </Button>
      <RefineAnalysisDialog companySlug={companySlug} open={refineOpen} onOpenChange={setRefineOpen} />
    </>
  );
}
