"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { confirmCompanyAction } from "@/server/actions/analysis-actions";

export function ConfirmCompanyButton({ slug, analysisId }: { slug: string; analysisId?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!analysisId) {
    return (
      <Button asChild variant="brand" size="lg" className="h-10 px-4">
        <Link href={routes.analysisResearch(slug)}>
          {ui.resolve.confirm}
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="brand"
        size="lg"
        className="h-10 px-4"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await confirmCompanyAction(analysisId);
            if (result?.error) setError(result.error);
          });
        }}
      >
        {ui.resolve.confirm}
        <ArrowRight data-icon="inline-end" />
      </Button>
      {error ? <p className="text-xs text-conflict">{error}</p> : null}
    </div>
  );
}
