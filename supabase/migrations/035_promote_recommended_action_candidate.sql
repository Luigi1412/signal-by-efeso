-- Atomic promotion: RecommendedActionCandidate → RecommendedAction + links + rationale.
-- SECURITY DEFINER, admin-only. Status changes and dismissal also admin-only.

CREATE OR REPLACE FUNCTION public.promote_recommended_action_candidate(p_candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_cand public.recommended_action_candidates%ROWTYPE;
  v_action_id uuid;
  v_prev_id uuid;
  v_next_version integer;
  v_link jsonb;
  v_rel jsonb;
  v_ko jsonb;
  v_rationale jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cand
  FROM public.recommended_action_candidates
  WHERE id = p_candidate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'recommended action candidate not found';
  END IF;

  IF NOT public.is_active_workspace_member(v_cand.workspace_id) THEN
    RAISE EXCEPTION 'not a workspace member' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_workspace_admin(v_cand.workspace_id) THEN
    RAISE EXCEPTION 'not a workspace admin' USING ERRCODE = '42501';
  END IF;

  IF v_cand.promoted_action_id IS NOT NULL THEN
    IF v_cand.status <> 'promoted' THEN
      UPDATE public.recommended_action_candidates
      SET status = 'promoted',
          promoted_at = coalesce(promoted_at, now())
      WHERE id = v_cand.id;
    END IF;
    RETURN v_cand.promoted_action_id;
  END IF;

  IF v_cand.status = 'promoted' THEN
    RAISE EXCEPTION 'candidate marked promoted without action';
  END IF;

  IF v_cand.status <> 'validated' THEN
    RAISE EXCEPTION 'candidate is not validated';
  END IF;

  IF v_cand.proposed_action_type = 'other' THEN
    RAISE EXCEPTION 'action type other cannot be auto-promoted';
  END IF;

  SELECT id, version INTO v_prev_id, v_next_version
  FROM public.recommended_actions
  WHERE workspace_id = v_cand.workspace_id
    AND company_id = v_cand.company_id
    AND status = 'active'
    AND metadata->>'fingerprint' = v_cand.candidate_fingerprint
  FOR UPDATE;

  IF v_prev_id IS NOT NULL THEN
    UPDATE public.recommended_actions
    SET status = 'archived'
    WHERE id = v_prev_id;
    v_next_version := v_next_version + 1;
  ELSE
    v_next_version := greatest(v_cand.version, 1);
  END IF;

  INSERT INTO public.recommended_actions (
    workspace_id,
    company_id,
    opportunity_id,
    action_type,
    title,
    rationale,
    status,
    priority,
    confidence_tier,
    relationship_context_id,
    origin_action_candidate_id,
    origin_model_run_id,
    supersedes_action_id,
    version,
    metadata
  ) VALUES (
    v_cand.workspace_id,
    v_cand.company_id,
    v_cand.opportunity_id,
    v_cand.proposed_action_type,
    v_cand.proposed_title,
    v_cand.proposed_rationale,
    'active',
    v_cand.proposed_priority,
    v_cand.proposed_confidence_tier,
    CASE
      WHEN jsonb_typeof(v_cand.proposed_relationship_links) = 'array'
           AND jsonb_array_length(v_cand.proposed_relationship_links) > 0
      THEN (v_cand.proposed_relationship_links->0->>'account_relationship_id')::uuid
      ELSE NULL
    END,
    v_cand.id,
    v_cand.generation_model_run_id,
    v_prev_id,
    v_next_version,
    jsonb_build_object('fingerprint', v_cand.candidate_fingerprint) || coalesce(v_cand.metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_action_id;

  FOR v_link IN SELECT * FROM jsonb_array_elements(coalesce(v_cand.proposed_opportunity_links, '[]'::jsonb))
  LOOP
    INSERT INTO public.recommended_action_opportunities (
      workspace_id, action_id, opportunity_id, relationship_type
    ) VALUES (
      v_cand.workspace_id,
      v_action_id,
      (v_link->>'opportunity_id')::uuid,
      coalesce(v_link->>'relationship_type', 'primary')
    );
  END LOOP;

  FOR v_rel IN SELECT * FROM jsonb_array_elements(coalesce(v_cand.proposed_relationship_links, '[]'::jsonb))
  LOOP
    INSERT INTO public.recommended_action_relationships (
      workspace_id, action_id, account_relationship_id, relationship_type
    ) VALUES (
      v_cand.workspace_id,
      v_action_id,
      (v_rel->>'account_relationship_id')::uuid,
      coalesce(v_rel->>'relationship_type', 'informs')
    );
  END LOOP;

  FOR v_ko IN SELECT * FROM jsonb_array_elements(coalesce(v_cand.proposed_knowledge_links, '[]'::jsonb))
  LOOP
    INSERT INTO public.recommended_action_knowledge_objects (
      workspace_id, action_id, knowledge_object_id, relationship_type
    ) VALUES (
      v_cand.workspace_id,
      v_action_id,
      (v_ko->>'knowledge_object_id')::uuid,
      coalesce(v_ko->>'relationship_type', 'supporting')
    );
  END LOOP;

  FOR v_rationale IN SELECT * FROM jsonb_array_elements(coalesce(v_cand.proposed_rationale_blocks, '[]'::jsonb))
  LOOP
    INSERT INTO public.recommended_action_rationales (
      workspace_id, action_id, rationale_type, statement, source_type, source_id
    ) VALUES (
      v_cand.workspace_id,
      v_action_id,
      v_rationale->>'rationale_type',
      v_rationale->>'statement',
      NULLIF(v_rationale->>'source_type', ''),
      NULLIF(v_rationale->>'source_id', '')::uuid
    );
  END LOOP;

  INSERT INTO public.recommended_action_events (
    workspace_id, action_id, actor_user_id, from_status, to_status, reason
  ) VALUES (
    v_cand.workspace_id, v_action_id, v_user, NULL, 'active', 'promoted'
  );

  UPDATE public.recommended_action_candidates
  SET status = 'promoted',
      promoted_at = now(),
      promoted_action_id = v_action_id
  WHERE id = v_cand.id;

  RETURN v_action_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_recommended_action_candidate(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_recommended_action_candidate(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dismiss_recommended_action(p_action_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_action public.recommended_actions%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_action FROM public.recommended_actions WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'recommended action not found';
  END IF;
  IF NOT public.is_workspace_admin(v_action.workspace_id) THEN
    RAISE EXCEPTION 'not a workspace admin' USING ERRCODE = '42501';
  END IF;

  UPDATE public.recommended_actions
  SET status = 'dismissed',
      dismissal_reason = p_reason
  WHERE id = p_action_id;

  INSERT INTO public.recommended_action_events (
    workspace_id, action_id, actor_user_id, from_status, to_status, reason
  ) VALUES (
    v_action.workspace_id, p_action_id, v_user, v_action.status, 'dismissed', p_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dismiss_recommended_action(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_recommended_action(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_recommended_action_status(p_action_id uuid, p_status text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_action public.recommended_actions%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_action FROM public.recommended_actions WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'recommended action not found';
  END IF;
  IF NOT public.is_workspace_admin(v_action.workspace_id) THEN
    RAISE EXCEPTION 'not a workspace admin' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('active', 'completed', 'dismissed', 'archived') THEN
    RAISE EXCEPTION 'unsupported action status';
  END IF;

  UPDATE public.recommended_actions
  SET status = p_status,
      dismissal_reason = CASE WHEN p_status = 'dismissed' THEN p_reason ELSE dismissal_reason END
  WHERE id = p_action_id;

  INSERT INTO public.recommended_action_events (
    workspace_id, action_id, actor_user_id, from_status, to_status, reason
  ) VALUES (
    v_action.workspace_id, p_action_id, v_user, v_action.status, p_status, p_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_recommended_action_status(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_recommended_action_status(uuid, text, text) TO authenticated;
