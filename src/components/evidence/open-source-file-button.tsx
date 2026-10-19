"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";
import { createSourceFileSignedUrlAction } from "@/server/actions/evidence-actions";

export function OpenSourceFileButton({ snapshotId }: { snapshotId: string }) {
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleOpen() {
    setError(false);
    setPending(true);
    const result = await createSourceFileSignedUrlAction(snapshotId);
    setPending(false);
    if (!result.ok) {
      setError(true);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button type="button" variant="outline" size="sm" onClick={handleOpen} disabled={pending}>
        <ExternalLink className="size-3.5" />
        {ui.evidence.openSource}
      </Button>
      {error && <p className="text-xs text-conflict">{ui.evidence.sourceFileError}</p>}
    </div>
  );
}
