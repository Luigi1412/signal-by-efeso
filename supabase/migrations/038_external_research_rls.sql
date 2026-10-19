-- Sprint 10 RLS.
-- Members may create queued runs and read workspace research metadata.
-- They cannot forge accepted sources, rewrite status into completed, or inject fetched content.

ALTER TABLE public.company_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_research_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_source_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_research_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.company_aliases FROM anon, authenticated;
REVOKE ALL ON TABLE public.external_research_runs FROM anon, authenticated;
REVOKE ALL ON TABLE public.external_source_candidates FROM anon, authenticated;
REVOKE ALL ON TABLE public.external_research_events FROM anon, authenticated;

GRANT SELECT ON TABLE public.company_aliases TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.external_research_runs TO authenticated;
GRANT SELECT ON TABLE public.external_source_candidates TO authenticated;
GRANT SELECT ON TABLE public.external_research_events TO authenticated;

CREATE POLICY company_aliases_select_member
  ON public.company_aliases FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY external_research_runs_select_member
  ON public.external_research_runs FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY external_research_runs_insert_member
  ON public.external_research_runs FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_workspace_member(workspace_id)
    AND created_by = auth.uid()
    AND status = 'queued'
    AND resolved_company_id IS NULL
    AND analysis_id IS NULL
    AND research_run_id IS NULL
    AND accepted_source_count = 0
  );

CREATE POLICY external_research_runs_update_cancel_member
  ON public.external_research_runs FOR UPDATE TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND created_by = auth.uid()
    AND status NOT IN ('completed', 'partial', 'failed', 'cancelled')
  )
  WITH CHECK (
    public.is_active_workspace_member(workspace_id)
    AND created_by = auth.uid()
    AND status = 'cancelled'
  );

CREATE POLICY external_source_candidates_select_member
  ON public.external_source_candidates FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY external_research_events_select_member
  ON public.external_research_events FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));
