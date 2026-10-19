-- Sprint 4 RLS. Members may SELECT workspace knowledge. Tags are a global catalog.
-- Authenticated clients cannot mutate pipeline or active knowledge state.

ALTER TABLE public.knowledge_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_tag_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_candidate_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_candidate_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.efeso_knowledge_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_object_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_object_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_object_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_object_relations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.knowledge_tags FROM anon, authenticated;
REVOKE ALL ON TABLE public.knowledge_tag_aliases FROM anon, authenticated;
REVOKE ALL ON TABLE public.knowledge_candidates FROM anon, authenticated;
REVOKE ALL ON TABLE public.knowledge_candidate_evidence FROM anon, authenticated;
REVOKE ALL ON TABLE public.knowledge_candidate_validations FROM anon, authenticated;
REVOKE ALL ON TABLE public.efeso_knowledge_objects FROM anon, authenticated;
REVOKE ALL ON TABLE public.knowledge_object_aliases FROM anon, authenticated;
REVOKE ALL ON TABLE public.knowledge_object_tags FROM anon, authenticated;
REVOKE ALL ON TABLE public.knowledge_object_claims FROM anon, authenticated;
REVOKE ALL ON TABLE public.knowledge_object_relations FROM anon, authenticated;

GRANT SELECT ON TABLE public.knowledge_tags TO authenticated;
GRANT SELECT ON TABLE public.knowledge_tag_aliases TO authenticated;
GRANT SELECT ON TABLE public.knowledge_candidates TO authenticated;
GRANT SELECT ON TABLE public.knowledge_candidate_evidence TO authenticated;
GRANT SELECT ON TABLE public.knowledge_candidate_validations TO authenticated;
GRANT SELECT ON TABLE public.efeso_knowledge_objects TO authenticated;
GRANT SELECT ON TABLE public.knowledge_object_aliases TO authenticated;
GRANT SELECT ON TABLE public.knowledge_object_tags TO authenticated;
GRANT SELECT ON TABLE public.knowledge_object_claims TO authenticated;
GRANT SELECT ON TABLE public.knowledge_object_relations TO authenticated;

CREATE POLICY knowledge_tags_select_authenticated
  ON public.knowledge_tags FOR SELECT TO authenticated
  USING (true);

CREATE POLICY knowledge_tag_aliases_select_authenticated
  ON public.knowledge_tag_aliases FOR SELECT TO authenticated
  USING (true);

CREATE POLICY knowledge_candidates_select_member
  ON public.knowledge_candidates FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY knowledge_candidate_evidence_select_member
  ON public.knowledge_candidate_evidence FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY knowledge_candidate_validations_select_member
  ON public.knowledge_candidate_validations FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY efeso_knowledge_objects_select_member
  ON public.efeso_knowledge_objects FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY knowledge_object_aliases_select_member
  ON public.knowledge_object_aliases FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY knowledge_object_tags_select_member
  ON public.knowledge_object_tags FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY knowledge_object_claims_select_member
  ON public.knowledge_object_claims FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY knowledge_object_relations_select_member
  ON public.knowledge_object_relations FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));
