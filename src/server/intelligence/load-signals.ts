import "server-only";
import {
  listClaimsByIds,
  listEvidenceQuotesForClaims,
  listSignalClaims,
  listSignalTags,
  listSignalsForCompany,
} from "@/server/signals/persistence";
import type { AccountSignalInput } from "./types";

function nestedTag(row: {
  tag_id: string;
  knowledge_tags: { category: string; canonical_name: string } | { category: string; canonical_name: string }[] | null;
}): { tagId: string; category: string; canonicalName: string } | null {
  const nested = Array.isArray(row.knowledge_tags) ? row.knowledge_tags[0] : row.knowledge_tags;
  if (!nested) return null;
  return { tagId: row.tag_id, category: nested.category, canonicalName: nested.canonical_name };
}

function nestedExcerpt(value: { excerpt: string } | { excerpt: string }[] | null): string | null {
  const nested = Array.isArray(value) ? value[0] : value;
  return nested?.excerpt ?? null;
}

export async function loadAccountSignals(workspaceId: string, companyId: string): Promise<AccountSignalInput[]> {
  const rows = await listSignalsForCompany(workspaceId, companyId);
  const out: AccountSignalInput[] = [];
  for (const signal of rows) {
    const [tagRows, claimLinks] = await Promise.all([listSignalTags(signal.id), listSignalClaims(signal.id)]);
    const claimIds = claimLinks.map((row) => row.claim_id);
    const [claims, evidence] = await Promise.all([listClaimsByIds(claimIds), listEvidenceQuotesForClaims(claimIds)]);
    const snippets = evidence
      .map((row) => nestedExcerpt(row.evidence_fragments))
      .filter((value): value is string => Boolean(value))
      .slice(0, 2);
    out.push({
      id: signal.id,
      companyId: signal.company_id,
      workspaceId: signal.workspace_id,
      status: signal.status,
      signalType: signal.signal_type,
      signalNature: signal.signal_nature,
      title: signal.title,
      summary: signal.summary,
      importance: signal.importance,
      confidenceTier: signal.confidence_tier,
      assertionMode: signal.assertion_mode,
      eventDate: signal.event_date,
      geography: signal.geography,
      createdAt: signal.created_at,
      tags: tagRows.map(nestedTag).filter((row): row is NonNullable<typeof row> => Boolean(row)),
      claims: claims.map((claim) => ({
        id: claim.id,
        statement: claim.statement,
        assertionMode: claim.assertion_mode,
      })),
      evidenceSnippets: snippets,
    });
  }
  return out;
}
