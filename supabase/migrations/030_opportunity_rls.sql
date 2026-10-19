-- Sprint 7 RLS. Members may SELECT active Opportunities of their workspace.
-- Authenticated clients cannot insert active Opportunity, promote, forge links, or rewrite provenance.

ALTER TABLE public.opportunity_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_candidate_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_efeso_fits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_knowledge_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_rationales ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.opportunity_candidates FROM anon, authenticated;
REVOKE ALL ON TABLE public.opportunity_candidate_validations FROM anon, authenticated;
REVOKE ALL ON TABLE public.opportunities FROM anon, authenticated;
REVOKE ALL ON TABLE public.opportunity_signals FROM anon, authenticated;
REVOKE ALL ON TABLE public.opportunity_efeso_fits FROM anon, authenticated;
REVOKE ALL ON TABLE public.opportunity_knowledge_objects FROM anon, authenticated;
REVOKE ALL ON TABLE public.opportunity_rationales FROM anon, authenticated;

GRANT SELECT ON TABLE public.opportunity_candidates TO authenticated;
GRANT SELECT ON TABLE public.opportunity_candidate_validations TO authenticated;
GRANT SELECT ON TABLE public.opportunities TO authenticated;
GRANT SELECT ON TABLE public.opportunity_signals TO authenticated;
GRANT SELECT ON TABLE public.opportunity_efeso_fits TO authenticated;
GRANT SELECT ON TABLE public.opportunity_knowledge_objects TO authenticated;
GRANT SELECT ON TABLE public.opportunity_rationales TO authenticated;

CREATE POLICY opportunity_candidates_select_admin
  ON public.opportunity_candidates FOR SELECT TO authenticated
  USING (public.is_workspace_admin(workspace_id));

CREATE POLICY opportunity_candidate_validations_select_admin
  ON public.opportunity_candidate_validations FOR SELECT TO authenticated
  USING (public.is_workspace_admin(workspace_id));

CREATE POLICY opportunities_select_member
  ON public.opportunities FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (status = 'active' OR public.is_workspace_admin(workspace_id))
  );

CREATE POLICY opportunity_signals_select_member
  ON public.opportunity_signals FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (
      public.is_workspace_admin(workspace_id)
      OR EXISTS (
        SELECT 1 FROM public.opportunities o
        WHERE o.id = opportunity_id
          AND o.workspace_id = workspace_id
          AND o.status = 'active'
      )
    )
  );

CREATE POLICY opportunity_efeso_fits_select_member
  ON public.opportunity_efeso_fits FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (
      public.is_workspace_admin(workspace_id)
      OR EXISTS (
        SELECT 1 FROM public.opportunities o
        WHERE o.id = opportunity_id
          AND o.workspace_id = workspace_id
          AND o.status = 'active'
      )
    )
  );

CREATE POLICY opportunity_knowledge_objects_select_member
  ON public.opportunity_knowledge_objects FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (
      public.is_workspace_admin(workspace_id)
      OR EXISTS (
        SELECT 1 FROM public.opportunities o
        WHERE o.id = opportunity_id
          AND o.workspace_id = workspace_id
          AND o.status = 'active'
      )
    )
  );

CREATE POLICY opportunity_rationales_select_member
  ON public.opportunity_rationales FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (
      public.is_workspace_admin(workspace_id)
      OR EXISTS (
        SELECT 1 FROM public.opportunities o
        WHERE o.id = opportunity_id
          AND o.workspace_id = workspace_id
          AND o.status = 'active'
      )
    )
  );
