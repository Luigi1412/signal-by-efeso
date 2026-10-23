-- A derived payload is protected as a whole, including titles/rationales, not only object rows.
CREATE FUNCTION public.member_can_read_knowledge_object(p_workspace uuid,p_object uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.efeso_knowledge_objects k WHERE k.id=p_object AND k.workspace_id=p_workspace
    AND public.knowledge_member_can_read(k.workspace_id,k.visibility_level,k.confidentiality_level,k.approved_for_display,k.commercial_terms_present,k.knowledge_nature));
$$;
CREATE FUNCTION public.member_can_read_fit(p_fit uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.efeso_fits f WHERE f.id=p_fit
    AND public.is_active_workspace_member(f.workspace_id)
    AND public.member_can_read_knowledge_object(f.workspace_id,f.knowledge_object_id)
    AND NOT EXISTS(SELECT 1 FROM public.efeso_fit_components c WHERE c.efeso_fit_id=f.id
      AND c.source_type='knowledge_object' AND c.source_id IS NOT NULL
      AND NOT public.member_can_read_knowledge_object(f.workspace_id,c.source_id)));
$$;
CREATE FUNCTION public.member_can_read_opportunity(p_opportunity uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.opportunities o WHERE o.id=p_opportunity
    AND public.is_active_workspace_member(o.workspace_id)
    AND EXISTS(SELECT 1 FROM public.opportunity_knowledge_objects k WHERE k.opportunity_id=o.id)
    AND EXISTS(SELECT 1 FROM public.opportunity_efeso_fits f WHERE f.opportunity_id=o.id)
    AND NOT EXISTS(SELECT 1 FROM public.opportunity_knowledge_objects k WHERE k.opportunity_id=o.id
      AND NOT public.member_can_read_knowledge_object(o.workspace_id,k.knowledge_object_id))
    AND NOT EXISTS(SELECT 1 FROM public.opportunity_efeso_fits f WHERE f.opportunity_id=o.id AND NOT public.member_can_read_fit(f.efeso_fit_id)));
$$;
CREATE FUNCTION public.member_can_read_action(p_action uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.recommended_actions a WHERE a.id=p_action
    AND public.is_active_workspace_member(a.workspace_id)
    AND a.opportunity_id IS NOT NULL AND public.member_can_read_opportunity(a.opportunity_id)
    AND NOT EXISTS(SELECT 1 FROM public.recommended_action_knowledge_objects k WHERE k.action_id=a.id
      AND NOT public.member_can_read_knowledge_object(a.workspace_id,k.knowledge_object_id)));
$$;
REVOKE ALL ON FUNCTION public.member_can_read_knowledge_object(uuid,uuid), public.member_can_read_fit(uuid),
  public.member_can_read_opportunity(uuid),public.member_can_read_action(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.member_can_read_knowledge_object(uuid,uuid),public.member_can_read_fit(uuid),
  public.member_can_read_opportunity(uuid),public.member_can_read_action(uuid) TO authenticated,service_role;
-- Restrictive policies compose with existing tenant/status policies using AND.
CREATE POLICY efeso_fit_knowledge_visibility ON public.efeso_fits AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_fit(id));
CREATE POLICY efeso_fit_components_knowledge_visibility ON public.efeso_fit_components AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_fit(efeso_fit_id));
CREATE POLICY signal_matches_knowledge_visibility ON public.signal_knowledge_matches AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_knowledge_object(workspace_id,knowledge_object_id));
CREATE POLICY opportunity_knowledge_visibility ON public.opportunities AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_opportunity(id));
CREATE POLICY opportunity_signals_visibility ON public.opportunity_signals AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_opportunity(opportunity_id));
CREATE POLICY opportunity_fits_visibility ON public.opportunity_efeso_fits AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_opportunity(opportunity_id));
CREATE POLICY opportunity_objects_visibility ON public.opportunity_knowledge_objects AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_opportunity(opportunity_id));
CREATE POLICY opportunity_rationale_visibility ON public.opportunity_rationales AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_opportunity(opportunity_id));
CREATE POLICY actions_knowledge_visibility ON public.recommended_actions AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_action(id));
CREATE POLICY action_objects_visibility ON public.recommended_action_knowledge_objects AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_action(action_id));
CREATE POLICY action_rationale_visibility ON public.recommended_action_rationales AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_action(action_id));
CREATE POLICY action_opportunity_visibility ON public.recommended_action_opportunities AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_action(action_id));
CREATE POLICY action_relationship_visibility ON public.recommended_action_relationships AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_action(action_id));
