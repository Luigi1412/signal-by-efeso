-- Sprint 8 RLS. Members SELECT active relationship intelligence and actions of their workspace.
-- Authenticated clients cannot insert, promote, forge links, rewrite provenance, or raise strength.

ALTER TABLE public.relationship_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_relationship_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommended_action_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommended_action_candidate_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommended_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommended_action_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommended_action_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommended_action_knowledge_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommended_action_rationales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommended_action_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.relationship_persons FROM anon, authenticated;
REVOKE ALL ON TABLE public.account_relationships FROM anon, authenticated;
REVOKE ALL ON TABLE public.company_relationship_contacts FROM anon, authenticated;
REVOKE ALL ON TABLE public.recommended_action_candidates FROM anon, authenticated;
REVOKE ALL ON TABLE public.recommended_action_candidate_validations FROM anon, authenticated;
REVOKE ALL ON TABLE public.recommended_actions FROM anon, authenticated;
REVOKE ALL ON TABLE public.recommended_action_opportunities FROM anon, authenticated;
REVOKE ALL ON TABLE public.recommended_action_relationships FROM anon, authenticated;
REVOKE ALL ON TABLE public.recommended_action_knowledge_objects FROM anon, authenticated;
REVOKE ALL ON TABLE public.recommended_action_rationales FROM anon, authenticated;
REVOKE ALL ON TABLE public.recommended_action_events FROM anon, authenticated;

GRANT SELECT ON TABLE public.relationship_persons TO authenticated;
GRANT SELECT ON TABLE public.account_relationships TO authenticated;
GRANT SELECT ON TABLE public.company_relationship_contacts TO authenticated;
GRANT SELECT ON TABLE public.recommended_action_candidates TO authenticated;
GRANT SELECT ON TABLE public.recommended_action_candidate_validations TO authenticated;
GRANT SELECT ON TABLE public.recommended_actions TO authenticated;
GRANT SELECT ON TABLE public.recommended_action_opportunities TO authenticated;
GRANT SELECT ON TABLE public.recommended_action_relationships TO authenticated;
GRANT SELECT ON TABLE public.recommended_action_knowledge_objects TO authenticated;
GRANT SELECT ON TABLE public.recommended_action_rationales TO authenticated;
GRANT SELECT ON TABLE public.recommended_action_events TO authenticated;

CREATE POLICY relationship_persons_select_member
  ON public.relationship_persons FOR SELECT TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY account_relationships_select_member
  ON public.account_relationships FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (status = 'active' OR public.is_workspace_admin(workspace_id))
  );

CREATE POLICY company_relationship_contacts_select_member
  ON public.company_relationship_contacts FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (status = 'active' OR public.is_workspace_admin(workspace_id))
  );

CREATE POLICY recommended_action_candidates_select_admin
  ON public.recommended_action_candidates FOR SELECT TO authenticated
  USING (public.is_workspace_admin(workspace_id));

CREATE POLICY recommended_action_candidate_validations_select_admin
  ON public.recommended_action_candidate_validations FOR SELECT TO authenticated
  USING (public.is_workspace_admin(workspace_id));

CREATE POLICY recommended_actions_select_member
  ON public.recommended_actions FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (status IN ('active', 'completed', 'dismissed') OR public.is_workspace_admin(workspace_id))
  );

CREATE POLICY recommended_action_opportunities_select_member
  ON public.recommended_action_opportunities FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (
      public.is_workspace_admin(workspace_id)
      OR EXISTS (
        SELECT 1 FROM public.recommended_actions a
        WHERE a.id = action_id AND a.workspace_id = workspace_id AND a.status IN ('active', 'completed', 'dismissed')
      )
    )
  );

CREATE POLICY recommended_action_relationships_select_member
  ON public.recommended_action_relationships FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (
      public.is_workspace_admin(workspace_id)
      OR EXISTS (
        SELECT 1 FROM public.recommended_actions a
        WHERE a.id = action_id AND a.workspace_id = workspace_id AND a.status IN ('active', 'completed', 'dismissed')
      )
    )
  );

CREATE POLICY recommended_action_knowledge_objects_select_member
  ON public.recommended_action_knowledge_objects FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (
      public.is_workspace_admin(workspace_id)
      OR EXISTS (
        SELECT 1 FROM public.recommended_actions a
        WHERE a.id = action_id AND a.workspace_id = workspace_id AND a.status IN ('active', 'completed', 'dismissed')
      )
    )
  );

CREATE POLICY recommended_action_rationales_select_member
  ON public.recommended_action_rationales FOR SELECT TO authenticated
  USING (
    public.is_active_workspace_member(workspace_id)
    AND (
      public.is_workspace_admin(workspace_id)
      OR EXISTS (
        SELECT 1 FROM public.recommended_actions a
        WHERE a.id = action_id AND a.workspace_id = workspace_id AND a.status IN ('active', 'completed', 'dismissed')
      )
    )
  );

CREATE POLICY recommended_action_events_select_admin
  ON public.recommended_action_events FOR SELECT TO authenticated
  USING (public.is_workspace_admin(workspace_id));
