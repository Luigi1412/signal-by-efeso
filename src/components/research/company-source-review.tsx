import { ui } from "@/i18n";
import { formatDate } from "@/lib/labels";
import { listResearchRunsForCompany, listSourceCandidates } from "@/server/external-research/persistence";
import { listWorkspaceCompanies } from "@/server/external-research/persistence";
import { assertEfesoAccess } from "@/server/access/require-efeso-access";

export async function CompanySourceReview({ slug }: { slug: string }) {
  let rows: Awaited<ReturnType<typeof listSourceCandidates>> = [];
  let history: Awaited<ReturnType<typeof listResearchRunsForCompany>> = [];
  try {
    const access = await assertEfesoAccess();
    const companies = await listWorkspaceCompanies(access.workspaceId);
    const company = companies.find((item) => item.slug === slug);
    if (!company) return null;
    history = await listResearchRunsForCompany(access.workspaceId, company.id);
    const latest = history[0];
    if (latest) rows = await listSourceCandidates(latest.id);
  } catch {
    return null;
  }
  if (rows.length === 0 && history.length === 0) return null;

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground">{ui.externalResearch.analyzedSources}</h2>
      {history[0]?.completed_at || history[0]?.started_at ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {ui.workspace.lastResearched}: {formatDate(history[0]?.completed_at ?? history[0]?.started_at)}
        </p>
      ) : null}
      <ul className="mt-4 divide-y">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
            <div>
              <a href={row.url} target="_blank" rel="noreferrer" className="font-medium underline-offset-4 hover:underline">
                {row.title || row.publisher}
              </a>
              <p className="text-xs text-muted-foreground">
                {row.publisher}
                {row.published_at ? ` · ${formatDate(row.published_at)}` : ""} · {row.source_type.replaceAll("_", " ")} ·{" "}
                {row.source_quality === "primary" ? ui.externalResearch.primary : ui.externalResearch.secondary} ·{" "}
                {row.status === "rejected" ? ui.externalResearch.rejected : ui.externalResearch.accepted}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {history.length > 1 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground">{ui.externalResearch.history}</p>
          <ul className="mt-1 text-xs text-muted-foreground">
            {history.slice(0, 8).map((run) => (
              <li key={run.id}>
                {formatDate(run.created_at)} · {run.status} · {run.accepted_source_count} {ui.externalResearch.acceptedSources}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
