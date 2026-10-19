-- Sprint 3 RLS. Members may SELECT pipeline rows in their workspace.
-- Authenticated clients cannot INSERT/UPDATE/DELETE internal pipeline state.

ALTER TABLE public.source_content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_candidate_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_candidate_validations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.source_content_blocks FROM anon, authenticated;
REVOKE ALL ON TABLE public.model_runs FROM anon, authenticated;
REVOKE ALL ON TABLE public.claim_candidates FROM anon, authenticated;
REVOKE ALL ON TABLE public.claim_candidate_evidence FROM anon, authenticated;
REVOKE ALL ON TABLE public.claim_candidate_validations FROM anon, authenticated;

GRANT SELECT ON TABLE public.source_content_blocks TO authenticated;
GRANT SELECT ON TABLE public.model_runs TO authenticated;
GRANT SELECT ON TABLE public.claim_candidates TO authenticated;
GRANT SELECT ON TABLE public.claim_candidate_evidence TO authenticated;
GRANT SELECT ON TABLE public.claim_candidate_validations TO authenticated;

CREATE POLICY source_content_blocks_select_member
  ON public.source_content_blocks FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY model_runs_select_member
  ON public.model_runs FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY claim_candidates_select_member
  ON public.claim_candidates FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY claim_candidate_evidence_select_member
  ON public.claim_candidate_evidence FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY claim_candidate_validations_select_member
  ON public.claim_candidate_validations FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));
