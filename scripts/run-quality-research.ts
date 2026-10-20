/**
 * One-off quality gate research runner (local only).
 * Usage: npx tsx --env-file=.env.local scripts/run-quality-research.ts "luxottica" BR essilorluxottica.com
 */
import { startExternalCompanyResearch, tickExternalCompanyResearch } from "../src/server/external-research/orchestrator";
import { getResearchRun, listSourceCandidates } from "../src/server/external-research/persistence";
import { createPipelineAdminClient } from "../src/lib/supabase/pipeline-admin";

const query = process.argv[2] ?? "luxottica";
const country = process.argv[3] ?? "BR";
const domain = process.argv[4] ?? "essilorluxottica.com";

async function main() {
  const db = createPipelineAdminClient();
  const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
  const { data: user } = await db.from("workspace_memberships").select("user_id, workspace_id").limit(1).maybeSingle();
  const workspaceId =
    (ws as { id?: string } | null)?.id ??
    (user as { workspace_id?: string } | null)?.workspace_id ??
    "0e8f0e50-b2a1-4c3d-9e7f-000000000001";
  const userId = (user as { user_id?: string } | null)?.user_id ?? "87053cbf-f60e-444f-a96a-88458189ed8f";
  if (!workspaceId || !userId) throw new Error("No workspace/member found");

  const run = await startExternalCompanyResearch({
    workspaceId,
    userId,
    query,
    country,
    selectedDomain: domain,
    confirmUnresolved: true,
  });
  console.log(JSON.stringify({ started: run.id, status: run.status, query, country, domain }));

  const terminal = new Set(["completed", "partial", "failed", "cancelled", "needs_user_resolution"]);
  let current = run;
  const started = Date.now();
  while (!terminal.has(current.status) && Date.now() - started < 12 * 60 * 1000) {
    current = await tickExternalCompanyResearch(workspaceId, current.id);
    console.log(JSON.stringify({ status: current.status, ms: Date.now() - started }));
    if (!terminal.has(current.status)) await new Promise((r) => setTimeout(r, 1500));
  }

  const final = (await getResearchRun(workspaceId, current.id)) ?? current;
  const sources = await listSourceCandidates(final.id);
  const retained = sources.filter((s) => s.status !== "rejected" && s.status !== "discovered" && s.snapshot_id);
  const rejected = sources.filter((s) => s.status === "rejected");
  const primary = retained.filter((s) => s.source_quality === "primary");
  console.log(
    JSON.stringify(
      {
        runId: final.id,
        companyId: final.resolved_company_id,
        status: final.status,
        failure: final.failure_code,
        payload: final.resolution_payload,
        counts: {
          discovered: sources.length,
          retained: retained.length,
          rejected: rejected.length,
          primary: primary.length,
        },
        retainedSample: retained.slice(0, 8).map((s) => ({
          type: s.source_type,
          quality: s.source_quality,
          title: s.title,
          url: s.url,
        })),
        rejectionReasons: Object.entries(
          rejected.reduce<Record<string, number>>((acc, row) => {
            const key = row.rejection_reason ?? "unknown";
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
          }, {}),
        ),
        elapsedMs: Date.now() - started,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
