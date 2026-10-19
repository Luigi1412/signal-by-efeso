-- Accept camelCase or snake_case keys in proposed_components JSON.
-- TypeScript drafts use componentType; the RPC must persist closed component types.

CREATE OR REPLACE FUNCTION public.promote_efeso_fit_candidate(p_candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_cand public.efeso_fit_candidates%ROWTYPE;
  v_fit_id uuid;
  v_prev_id uuid;
  v_next_version integer;
  v_component jsonb;
  v_match jsonb;
  v_ko_status text;
  v_component_type text;
  v_component_value text;
  v_explanation text;
  v_source_type text;
  v_source_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cand
  FROM public.efeso_fit_candidates
  WHERE id = p_candidate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'efeso fit candidate not found';
  END IF;

  IF NOT public.is_active_workspace_member(v_cand.workspace_id) THEN
    RAISE EXCEPTION 'not a workspace member' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_workspace_admin(v_cand.workspace_id) THEN
    RAISE EXCEPTION 'not a workspace admin' USING ERRCODE = '42501';
  END IF;

  IF v_cand.promoted_fit_id IS NOT NULL THEN
    IF v_cand.status <> 'promoted' THEN
      UPDATE public.efeso_fit_candidates
      SET status = 'promoted',
          promoted_at = coalesce(promoted_at, now())
      WHERE id = v_cand.id;
    END IF;
    RETURN v_cand.promoted_fit_id;
  END IF;

  IF v_cand.status = 'promoted' THEN
    RAISE EXCEPTION 'candidate marked promoted without fit';
  END IF;

  IF v_cand.status <> 'validated' THEN
    RAISE EXCEPTION 'candidate is not validated';
  END IF;

  SELECT status INTO v_ko_status
  FROM public.efeso_knowledge_objects
  WHERE id = v_cand.knowledge_object_id
    AND workspace_id = v_cand.workspace_id;

  IF v_ko_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'knowledge object is not active';
  END IF;

  SELECT id, version INTO v_prev_id, v_next_version
  FROM public.efeso_fits
  WHERE workspace_id = v_cand.workspace_id
    AND company_id = v_cand.company_id
    AND knowledge_object_id = v_cand.knowledge_object_id
    AND status = 'active'
  FOR UPDATE;

  IF v_prev_id IS NOT NULL THEN
    UPDATE public.efeso_fits
    SET status = 'archived'
    WHERE id = v_prev_id;
    v_next_version := v_next_version + 1;
  ELSE
    v_next_version := greatest(v_cand.version, 1);
  END IF;

  INSERT INTO public.efeso_fits (
    workspace_id,
    company_id,
    knowledge_object_id,
    status,
    fit_level,
    fit_score,
    fit_reason_summary,
    origin_model_run_id,
    origin_candidate_id,
    version,
    supersedes_fit_id,
    metadata
  ) VALUES (
    v_cand.workspace_id,
    v_cand.company_id,
    v_cand.knowledge_object_id,
    'active',
    v_cand.proposed_fit_level,
    v_cand.proposed_fit_score,
    v_cand.proposed_rationale,
    v_cand.model_run_id,
    v_cand.id,
    v_next_version,
    v_prev_id,
    v_cand.metadata
  )
  RETURNING id INTO v_fit_id;

  FOR v_component IN SELECT * FROM jsonb_array_elements(v_cand.proposed_components)
  LOOP
    v_component_type := coalesce(v_component->>'component_type', v_component->>'componentType');
    v_component_value := coalesce(v_component->>'component_value', v_component->>'componentValue');
    v_explanation := coalesce(v_component->>'explanation', '');
    v_source_type := coalesce(v_component->>'source_type', v_component->>'sourceType', 'knowledge_object');
    v_source_id := NULLIF(coalesce(v_component->>'source_id', v_component->>'sourceId'), '')::uuid;
    INSERT INTO public.efeso_fit_components (
      workspace_id,
      efeso_fit_id,
      component_type,
      component_value,
      contribution,
      explanation,
      source_type,
      source_id
    ) VALUES (
      v_cand.workspace_id,
      v_fit_id,
      v_component_type,
      v_component_value,
      coalesce((v_component->>'contribution')::integer, 0),
      v_explanation,
      v_source_type,
      v_source_id
    );
  END LOOP;

  FOR v_match IN SELECT * FROM jsonb_array_elements(coalesce(v_cand.metadata->'signal_matches', '[]'::jsonb))
  LOOP
    INSERT INTO public.signal_knowledge_matches (
      workspace_id,
      signal_id,
      knowledge_object_id,
      match_type,
      match_strength,
      status,
      explanation,
      origin_fit_id
    ) VALUES (
      v_cand.workspace_id,
      coalesce(v_match->>'signal_id', v_match->>'signalId')::uuid,
      v_cand.knowledge_object_id,
      coalesce(v_match->>'match_type', v_match->>'matchType'),
      coalesce(v_match->>'match_strength', v_match->>'matchStrength', 'medium'),
      'active',
      coalesce(v_match->>'explanation', v_cand.proposed_rationale),
      v_fit_id
    )
    ON CONFLICT (signal_id, knowledge_object_id, match_type) DO UPDATE
      SET match_strength = EXCLUDED.match_strength,
          status = 'active',
          explanation = EXCLUDED.explanation,
          origin_fit_id = EXCLUDED.origin_fit_id;
  END LOOP;

  UPDATE public.efeso_fit_candidates
  SET status = 'promoted',
      promoted_at = now(),
      promoted_fit_id = v_fit_id
  WHERE id = v_cand.id;

  RETURN v_fit_id;
END;
$$;
