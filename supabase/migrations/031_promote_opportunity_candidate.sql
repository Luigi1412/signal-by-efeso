-- Atomic promotion: OpportunityCandidate → Opportunity + links + rationale.
-- SECURITY DEFINER, admin-only. Previous active version with the same fingerprint is archived.

CREATE OR REPLACE FUNCTION public.promote_opportunity_candidate(p_candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_cand public.opportunity_candidates%ROWTYPE;
  v_opp_id uuid;
  v_prev_id uuid;
  v_next_version integer;
  v_link jsonb;
  v_fit jsonb;
  v_ko jsonb;
  v_rationale jsonb;
  v_trigger_count integer;
  v_inactive_triggers integer;
  v_primary_count integer;
  v_inactive_primary integer;
  v_inactive_knowledge integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cand
  FROM public.opportunity_candidates
  WHERE id = p_candidate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'opportunity candidate not found';
  END IF;

  IF NOT public.is_active_workspace_member(v_cand.workspace_id) THEN
    RAISE EXCEPTION 'not a workspace member' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_workspace_admin(v_cand.workspace_id) THEN
    RAISE EXCEPTION 'not a workspace admin' USING ERRCODE = '42501';
  END IF;

  IF v_cand.promoted_opportunity_id IS NOT NULL THEN
    IF v_cand.status <> 'promoted' THEN
      UPDATE public.opportunity_candidates
      SET status = 'promoted',
          promoted_at = coalesce(promoted_at, now())
      WHERE id = v_cand.id;
    END IF;
    RETURN v_cand.promoted_opportunity_id;
  END IF;

  IF v_cand.status = 'promoted' THEN
    RAISE EXCEPTION 'candidate marked promoted without opportunity';
  END IF;

  IF v_cand.status <> 'validated' THEN
    RAISE EXCEPTION 'candidate is not validated';
  END IF;

  SELECT count(*) INTO v_trigger_count
  FROM jsonb_array_elements(v_cand.proposed_signal_links) AS link
  WHERE link->>'relationship_type' = 'trigger';

  IF v_trigger_count < 1 THEN
    RAISE EXCEPTION 'active opportunity requires at least one trigger Signal';
  END IF;

  SELECT count(*) INTO v_inactive_triggers
  FROM jsonb_array_elements(v_cand.proposed_signal_links) AS link
  JOIN public.signals s ON s.id = (link->>'signal_id')::uuid
  WHERE link->>'relationship_type' = 'trigger'
    AND (s.status <> 'active' OR s.workspace_id <> v_cand.workspace_id OR s.company_id <> v_cand.company_id);

  IF v_inactive_triggers > 0 THEN
    RAISE EXCEPTION 'candidate references inactive or inconsistent trigger Signals';
  END IF;

  SELECT count(*) INTO v_primary_count
  FROM jsonb_array_elements(v_cand.proposed_fit_links) AS link
  WHERE link->>'relationship_type' = 'primary';

  IF v_primary_count < 1 THEN
    RAISE EXCEPTION 'active opportunity requires at least one primary EFESO Fit';
  END IF;

  SELECT count(*) INTO v_inactive_primary
  FROM jsonb_array_elements(v_cand.proposed_fit_links) AS link
  JOIN public.efeso_fits f ON f.id = (link->>'efeso_fit_id')::uuid
  WHERE link->>'relationship_type' = 'primary'
    AND (f.status <> 'active' OR f.workspace_id <> v_cand.workspace_id OR f.company_id <> v_cand.company_id);

  IF v_inactive_primary > 0 THEN
    RAISE EXCEPTION 'candidate references inactive or inconsistent primary EFESO Fit';
  END IF;

  SELECT count(*) INTO v_inactive_knowledge
  FROM jsonb_array_elements(v_cand.proposed_knowledge_links) AS link
  JOIN public.efeso_knowledge_objects ko ON ko.id = (link->>'knowledge_object_id')::uuid
  WHERE ko.status <> 'active' OR ko.workspace_id <> v_cand.workspace_id;

  IF v_inactive_knowledge > 0 THEN
    RAISE EXCEPTION 'candidate references inactive or review KnowledgeObjects';
  END IF;

  SELECT id, version INTO v_prev_id, v_next_version
  FROM public.opportunities
  WHERE workspace_id = v_cand.workspace_id
    AND company_id = v_cand.company_id
    AND status = 'active'
    AND metadata->>'fingerprint' = v_cand.candidate_fingerprint
  FOR UPDATE;

  IF v_prev_id IS NOT NULL THEN
    UPDATE public.opportunities
    SET status = 'archived'
    WHERE id = v_prev_id;
    v_next_version := v_next_version + 1;
  ELSE
    v_next_version := greatest(v_cand.version, 1);
  END IF;

  INSERT INTO public.opportunities (
    workspace_id,
    company_id,
    title,
    summary,
    status,
    opportunity_type,
    maturity,
    relevance_level,
    urgency_level,
    confidence_tier,
    assertion_mode,
    geography,
    account_intelligence_id,
    primary_efeso_fit_id,
    origin_opportunity_candidate_id,
    origin_model_run_id,
    parent_opportunity_id,
    supersedes_opportunity_id,
    version,
    metadata
  ) VALUES (
    v_cand.workspace_id,
    v_cand.company_id,
    v_cand.proposed_title,
    v_cand.proposed_summary,
    'active',
    v_cand.proposed_opportunity_type,
    v_cand.proposed_maturity,
    v_cand.proposed_relevance_level,
    v_cand.proposed_urgency_level,
    v_cand.proposed_confidence_tier,
    v_cand.proposed_assertion_mode,
    v_cand.proposed_geography,
    v_cand.proposed_account_intelligence_id,
    v_cand.proposed_primary_efeso_fit_id,
    v_cand.id,
    v_cand.generation_model_run_id,
    v_cand.proposed_parent_opportunity_id,
    v_prev_id,
    v_next_version,
    coalesce(v_cand.metadata, '{}'::jsonb) || jsonb_build_object('fingerprint', v_cand.candidate_fingerprint)
  )
  RETURNING id INTO v_opp_id;

  FOR v_link IN SELECT * FROM jsonb_array_elements(v_cand.proposed_signal_links)
  LOOP
    INSERT INTO public.opportunity_signals (
      workspace_id, opportunity_id, signal_id, relationship_type
    ) VALUES (
      v_cand.workspace_id,
      v_opp_id,
      (v_link->>'signal_id')::uuid,
      v_link->>'relationship_type'
    );
  END LOOP;

  FOR v_fit IN SELECT * FROM jsonb_array_elements(v_cand.proposed_fit_links)
  LOOP
    INSERT INTO public.opportunity_efeso_fits (
      workspace_id, opportunity_id, efeso_fit_id, relationship_type
    ) VALUES (
      v_cand.workspace_id,
      v_opp_id,
      (v_fit->>'efeso_fit_id')::uuid,
      v_fit->>'relationship_type'
    );
  END LOOP;

  FOR v_ko IN SELECT * FROM jsonb_array_elements(v_cand.proposed_knowledge_links)
  LOOP
    INSERT INTO public.opportunity_knowledge_objects (
      workspace_id, opportunity_id, knowledge_object_id, relationship_type
    ) VALUES (
      v_cand.workspace_id,
      v_opp_id,
      (v_ko->>'knowledge_object_id')::uuid,
      v_ko->>'relationship_type'
    );
  END LOOP;

  FOR v_rationale IN SELECT * FROM jsonb_array_elements(v_cand.proposed_rationale_blocks)
  LOOP
    INSERT INTO public.opportunity_rationales (
      workspace_id, opportunity_id, rationale_type, statement, source_type, source_id
    ) VALUES (
      v_cand.workspace_id,
      v_opp_id,
      v_rationale->>'rationale_type',
      v_rationale->>'statement',
      NULLIF(v_rationale->>'source_type', ''),
      NULLIF(v_rationale->>'source_id', '')::uuid
    );
  END LOOP;

  UPDATE public.opportunity_candidates
  SET status = 'promoted',
      promoted_at = now(),
      promoted_opportunity_id = v_opp_id
  WHERE id = v_cand.id;

  RETURN v_opp_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_opportunity_candidate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_opportunity_candidate(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dismiss_opportunity(p_opportunity_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_opp public.opportunities%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_opp
  FROM public.opportunities
  WHERE id = p_opportunity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'opportunity not found';
  END IF;

  IF NOT public.is_workspace_admin(v_opp.workspace_id) THEN
    RAISE EXCEPTION 'not a workspace admin' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NOT NULL AND p_reason NOT IN (
    'not_relevant', 'already_known', 'no_client_need', 'poor_fit', 'duplicate', 'outdated', 'other'
  ) THEN
    RAISE EXCEPTION 'invalid dismissal reason';
  END IF;

  UPDATE public.opportunities
  SET status = 'dismissed',
      dismissal_reason = p_reason
  WHERE id = v_opp.id;
END;
$$;

REVOKE ALL ON FUNCTION public.dismiss_opportunity(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dismiss_opportunity(uuid, text) TO authenticated;
