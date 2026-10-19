-- Sprint 5 RLS. Members may SELECT workspace signals. Authenticated clients
-- cannot mutate pipeline state, promote candidates, or insert active signals.

ALTER TABLE public.signal_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_candidate_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_candidate_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_tags ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.signal_candidates FROM anon, authenticated;
REVOKE ALL ON TABLE public.signal_candidate_claims FROM anon, authenticated;
REVOKE ALL ON TABLE public.signal_candidate_validations FROM anon, authenticated;
REVOKE ALL ON TABLE public.signals FROM anon, authenticated;
REVOKE ALL ON TABLE public.signal_claims FROM anon, authenticated;
REVOKE ALL ON TABLE public.signal_companies FROM anon, authenticated;
REVOKE ALL ON TABLE public.signal_tags FROM anon, authenticated;

GRANT SELECT ON TABLE public.signal_candidates TO authenticated;
GRANT SELECT ON TABLE public.signal_candidate_claims TO authenticated;
GRANT SELECT ON TABLE public.signal_candidate_validations TO authenticated;
GRANT SELECT ON TABLE public.signals TO authenticated;
GRANT SELECT ON TABLE public.signal_claims TO authenticated;
GRANT SELECT ON TABLE public.signal_companies TO authenticated;
GRANT SELECT ON TABLE public.signal_tags TO authenticated;

CREATE POLICY signal_candidates_select_member
  ON public.signal_candidates FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY signal_candidate_claims_select_member
  ON public.signal_candidate_claims FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY signal_candidate_validations_select_member
  ON public.signal_candidate_validations FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY signals_select_member
  ON public.signals FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY signal_claims_select_member
  ON public.signal_claims FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY signal_companies_select_member
  ON public.signal_companies FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY signal_tags_select_member
  ON public.signal_tags FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));
