"use client";

import { useState, useTransition } from "react";
import { reviewKnowledgeObjectAction } from "@/server/actions/knowledge-actions";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n";

const copy = ui.admin.knowledgeLab;

export interface KnowledgeCatalogRow {
  id: string;
  canonicalName: string;
  objectType: string;
  status: string;
  visibilityLevel: string;
  confidentialityLevel: string;
  knowledgeNature: string;
  outcomeStatus: string;
  approvedForMatching: boolean;
  approvedForDisplay: boolean;
  sourceDocumentType: string | null;
  origin: string | null;
  catalogSection: string | null;
}

export function KnowledgeCatalogReview({ objects }: { objects: KnowledgeCatalogRow[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onAction(objectId: string, action: "approve" | "archive") {
    const formData = new FormData();
    formData.set("objectId", objectId);
    formData.set("action", action);
    startTransition(async () => {
      setError(null);
      const result = await reviewKnowledgeObjectAction(formData);
      if (!result.ok) setError(result.error);
      else window.location.reload();
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">{copy.reviewTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.reviewDescription}</p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {objects.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.emptyCatalog}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">{copy.objects}</th>
                <th className="px-3 py-2 font-medium">{copy.sourceDocument}</th>
                <th className="px-3 py-2 font-medium">{copy.visibility}</th>
                <th className="px-3 py-2 font-medium">{copy.confidentiality}</th>
                <th className="px-3 py-2 font-medium">{copy.knowledgeNature}</th>
                <th className="px-3 py-2 font-medium">{copy.outcomeStatus}</th>
                <th className="px-3 py-2 font-medium">{copy.approvedMatching}</th>
                <th className="px-3 py-2 font-medium">{copy.approvedDisplay}</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {objects.map((object) => (
                <tr key={object.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-medium">{object.canonicalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {object.objectType} · {object.status}
                      {object.origin ? ` · ${object.origin}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-xs">{object.sourceDocumentType ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{object.visibilityLevel}</td>
                  <td className="px-3 py-2 text-xs">{object.confidentialityLevel}</td>
                  <td className="px-3 py-2 text-xs">{object.knowledgeNature}</td>
                  <td className="px-3 py-2 text-xs">{object.outcomeStatus}</td>
                  <td className="px-3 py-2 text-xs">{object.approvedForMatching ? "sim" : "não"}</td>
                  <td className="px-3 py-2 text-xs">{object.approvedForDisplay ? "sim" : "não"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onAction(object.id, "approve")}>
                        {copy.approve}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => onAction(object.id, "archive")}>
                        {copy.archive}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
