-- Sprint 6 RLS. Members may SELECT active Account Intelligence, active EFESO Fits,
-- and active/validated SignalKnowledgeMatches. Authenticated clients cannot promote,
-- forge fit, rewrite provenance, or create active intelligence.

ALTER TABLE public.account_intelligence_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_intelligence_candidate_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_intelligence_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_tensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_intelligence_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.efeso_fit_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.efeso_fit_candidate_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.efeso_fits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.efeso_fit_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_knowledge_matches ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.account_intelligence_candidates FROM anon, authenticated;
REVOKE ALL ON TABLE public.account_intelligence_candidate_validations FROM anon, authenticated;
REVOKE ALL ON TABLE public.account_intelligence FROM anon, authenticated;
REVOKE ALL ON TABLE public.account_intelligence_signals FROM anon, authenticated;
REVOKE ALL ON TABLE public.account_tensions FROM anon, authenticated;
REVOKE ALL ON TABLE public.account_intelligence_themes FROM anon, authenticated;
REVOKE ALL ON TABLE public.efeso_fit_candidates FROM anon, authenticated;
REVOKE ALL ON TABLE public.efeso_fit_candidate_validations FROM anon, authenticated;
REVOKE ALL ON TABLE public.efeso_fits FROM anon, authenticated;
REVOKE ALL ON TABLE public.efeso_fit_components FROM anon, authenticated;
REVOKE ALL ON TABLE public.signal_knowledge_matches FROM anon, authenticated;

GRANT SELECT ON TABLE public.account_intelligence_candidates TO authenticated;
GRANT SELECT ON TABLE public.account_intelligence_candidate_validations TO authenticated;
GRANT SELECT ON TABLE public.account_intelligence TO authenticated;
GRANT SELECT ON TABLE public.account_intelligence_signals TO authenticated;
GRANT SELECT ON TABLE public.account_tensions TO authenticated;
GRANT SELECT ON TABLE public.account_intelligence_themes TO authenticated;
GRANT SELECT ON TABLE public.efeso_fit_candidates TO authenticated;
GRANT SELECT ON TABLE public.efeso_fit_candidate_validations TO authenticated;
GRANT SELECT ON TABLE public.efeso_fits TO authenticated;
GRANT SELECT ON TABLE public.efeso_fit_components TO authenticated;
GRANT SELECT ON TABLE public.signal_knowledge_matches TO authenticated;

CREATE POLICY account_intelligence_candidates_select_admin
  ON public.account_intelligence_candidates FOR SELECT TO authenticated
  USING (public.is_workspace_admin(workspace_id));

CREATE POLICY account_intelligence_candidate_validations_select_admin
  ON public.account_intelligence_candidate_validations FOR SELECT TO authenticated
  USING (public.is_workspace_admin(workspace_id));

CREATE POLICY account_intelligence_select_member
  ON public.account_intelligence FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (status = 'active' OR public.is_workspace_admin(workspace_id))
  );

CREATE POLICY account_intelligence_signals_select_member
  ON public.account_intelligence_signals FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (
      public.is_workspace_admin(workspace_id)
      OR EXISTS (
        SELECT 1 FROM public.account_intelligence ai
        WHERE ai.id = account_intelligence_id
          AND ai.workspace_id = workspace_id
          AND ai.status = 'active'
      )
    )
  );

CREATE POLICY account_tensions_select_member
  ON public.account_tensions FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (
      public.is_workspace_admin(workspace_id)
      OR EXISTS (
        SELECT 1 FROM public.account_intelligence ai
        WHERE ai.id = account_intelligence_id
          AND ai.workspace_id = workspace_id
          AND ai.status = 'active'
      )
    )
  );

CREATE POLICY account_intelligence_themes_select_member
  ON public.account_intelligence_themes FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (
      public.is_workspace_admin(workspace_id)
      OR EXISTS (
        SELECT 1 FROM public.account_intelligence ai
        WHERE ai.id = account_intelligence_id
          AND ai.workspace_id = workspace_id
          AND ai.status = 'active'
      )
    )
  );

CREATE POLICY efeso_fit_candidates_select_admin
  ON public.efeso_fit_candidates FOR SELECT TO authenticated
  USING (public.is_workspace_admin(workspace_id));

CREATE POLICY efeso_fit_candidate_validations_select_admin
  ON public.efeso_fit_candidate_validations FOR SELECT TO authenticated
  USING (public.is_workspace_admin(workspace_id));

CREATE POLICY efeso_fits_select_member
  ON public.efeso_fits FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (status = 'active' OR public.is_workspace_admin(workspace_id))
  );

CREATE POLICY efeso_fit_components_select_member
  ON public.efeso_fit_components FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (
      public.is_workspace_admin(workspace_id)
      OR EXISTS (
        SELECT 1 FROM public.efeso_fits f
        WHERE f.id = efeso_fit_id
          AND f.workspace_id = workspace_id
          AND f.status = 'active'
      )
    )
  );

CREATE POLICY signal_knowledge_matches_select_member
  ON public.signal_knowledge_matches FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (status IN ('active', 'validated') OR public.is_workspace_admin(workspace_id))
  );
