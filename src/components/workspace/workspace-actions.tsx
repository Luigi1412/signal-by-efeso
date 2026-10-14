"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Download, SlidersHorizontal } from "lucide-react";
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
  const pathname = usePathname();
  const router = useRouter();
  const label = downloadLabel ?? ui.workspace.downloadReport;
  const reportPath = routes.companyTab(companySlug, "report");

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
      <Button variant="brand" onClick={() => setRefineOpen(true)}>
        <SlidersHorizontal data-icon="inline-start" />
        {ui.workspace.refine}
      </Button>
      <RefineAnalysisDialog companySlug={companySlug} open={refineOpen} onOpenChange={setRefineOpen} />
    </>
  );
}
