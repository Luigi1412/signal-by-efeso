-- Sprint 2 RLS. Same active-membership helper as Sprint 1.
-- anon has no table access. No DELETE policies on the evidence chain.

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_run_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_fragments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_evidence ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.sources FROM anon, authenticated;
REVOKE ALL ON TABLE public.research_run_sources FROM anon, authenticated;
REVOKE ALL ON TABLE public.source_snapshots FROM anon, authenticated;
REVOKE ALL ON TABLE public.evidence_fragments FROM anon, authenticated;
REVOKE ALL ON TABLE public.claims FROM anon, authenticated;
REVOKE ALL ON TABLE public.claim_evidence FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.sources TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.research_run_sources TO authenticated;
GRANT SELECT, INSERT ON TABLE public.source_snapshots TO authenticated;
GRANT SELECT, INSERT ON TABLE public.evidence_fragments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.claims TO authenticated;
GRANT SELECT, INSERT ON TABLE public.claim_evidence TO authenticated;

CREATE POLICY sources_select_member
  ON public.sources FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY sources_insert_member
  ON public.sources FOR INSERT TO authenticated
  WITH CHECK (public.is_active_workspace_member(workspace_id));

CREATE POLICY sources_update_member
  ON public.sources FOR UPDATE TO authenticated
  USING (public.is_active_workspace_member(workspace_id))
  WITH CHECK (public.is_active_workspace_member(workspace_id));

CREATE POLICY research_run_sources_select_member
  ON public.research_run_sources FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY research_run_sources_insert_member
  ON public.research_run_sources FOR INSERT TO authenticated
  WITH CHECK (public.is_active_workspace_member(workspace_id));

CREATE POLICY research_run_sources_update_member
  ON public.research_run_sources FOR UPDATE TO authenticated
  USING (public.is_active_workspace_member(workspace_id))
  WITH CHECK (public.is_active_workspace_member(workspace_id));

CREATE POLICY source_snapshots_select_member
  ON public.source_snapshots FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY source_snapshots_insert_member
  ON public.source_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.is_active_workspace_member(workspace_id));

CREATE POLICY evidence_fragments_select_member
  ON public.evidence_fragments FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY evidence_fragments_insert_member
  ON public.evidence_fragments FOR INSERT TO authenticated
  WITH CHECK (public.is_active_workspace_member(workspace_id));

CREATE POLICY claims_select_member
  ON public.claims FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY claims_insert_member
  ON public.claims FOR INSERT TO authenticated
  WITH CHECK (public.is_active_workspace_member(workspace_id));

CREATE POLICY claims_update_member
  ON public.claims FOR UPDATE TO authenticated
  USING (public.is_active_workspace_member(workspace_id))
  WITH CHECK (public.is_active_workspace_member(workspace_id));

CREATE POLICY claim_evidence_select_member
  ON public.claim_evidence FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY claim_evidence_insert_member
  ON public.claim_evidence FOR INSERT TO authenticated
  WITH CHECK (public.is_active_workspace_member(workspace_id));
