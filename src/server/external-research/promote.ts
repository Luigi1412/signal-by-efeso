import "server-only";
import { createPipelineAdminClient } from "@/lib/supabase/pipeline-admin";

type PromoteFn =
  | "promote_claim_candidate"
  | "promote_signal_candidate"
  | "promote_account_intelligence_candidate"
  | "promote_efeso_fit_candidate"
  | "promote_opportunity_candidate"
  | "promote_recommended_action_candidate";

export async function promoteViaPipelineAdmin(fn: PromoteFn, candidateId: string): Promise<string> {
  const rpc = createPipelineAdminClient() as unknown as {
    rpc: (name: PromoteFn, args: { p_candidate_id: string }) => Promise<{ data: string | null; error: { message: string } | null }>;
  };
  const { data, error } = await rpc.rpc(fn, { p_candidate_id: candidateId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`${fn} returned no id`);
  return String(data);
}
