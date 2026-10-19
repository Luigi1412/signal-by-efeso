-- Atomic promotion: KnowledgeCandidate → EfesoKnowledgeObject (+ aliases/tags).
-- SECURITY DEFINER, auth.uid() + membership, fixed search_path.

CREATE OR REPLACE FUNCTION public.promote_knowledge_candidate(p_candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_cand public.knowledge_candidates%ROWTYPE;
  v_object_id uuid;
  v_existing uuid;
  v_alias text;
  v_normalized text;
  v_tag jsonb;
  v_tag_id uuid;
  v_rel jsonb;
  v_target uuid;
  v_support_count integer;
  v_primary_block uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cand
  FROM public.knowledge_candidates
  WHERE id = p_candidate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'knowledge candidate not found';
  END IF;

  IF NOT public.is_active_workspace_member(v_cand.workspace_id) THEN
    RAISE EXCEPTION 'not a workspace member' USING ERRCODE = '42501';
  END IF;

  IF v_cand.promoted_knowledge_object_id IS NOT NULL THEN
    IF v_cand.status <> 'promoted' THEN
      UPDATE public.knowledge_candidates
      SET status = 'promoted',
          promoted_at = coalesce(promoted_at, now())
      WHERE id = v_cand.id;
    END IF;
    RETURN v_cand.promoted_knowledge_object_id;
  END IF;

  IF v_cand.status = 'promoted' THEN
    RAISE EXCEPTION 'candidate marked promoted without knowledge object';
  END IF;

  IF v_cand.status <> 'validated' THEN
    RAISE EXCEPTION 'candidate is not validated';
  END IF;

  SELECT count(*) INTO v_support_count
  FROM public.knowledge_candidate_evidence
  WHERE knowledge_candidate_id = v_cand.id;

  IF v_support_count < 1 THEN
    RAISE EXCEPTION 'no supporting citation';
  END IF;

  SELECT o.id INTO v_existing
  FROM public.knowledge_object_aliases a
  JOIN public.efeso_knowledge_objects o ON o.id = a.knowledge_object_id
  WHERE a.workspace_id = v_cand.workspace_id
    AND a.normalized_alias IN (v_cand.normalized_name, lower(btrim(v_cand.canonical_name)))
    AND o.object_type = v_cand.candidate_type
  LIMIT 1;

  IF v_existing IS NULL THEN
    SELECT id INTO v_existing
    FROM public.efeso_knowledge_objects
    WHERE workspace_id = v_cand.workspace_id
      AND object_type = v_cand.candidate_type
      AND normalized_name = v_cand.normalized_name
      AND status IN ('active', 'validated', 'draft')
    LIMIT 1;
  END IF;

  SELECT source_content_block_id INTO v_primary_block
  FROM public.knowledge_candidate_evidence
  WHERE knowledge_candidate_id = v_cand.id
  ORDER BY citation_order ASC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    v_object_id := v_existing;
  ELSE
    INSERT INTO public.efeso_knowledge_objects (
      workspace_id,
      object_type,
      canonical_name,
      normalized_name,
      short_description,
      status,
      source_snapshot_id,
      primary_content_block_id,
      origin_model_run_id,
      origin_candidate_id,
      metadata
    ) VALUES (
      v_cand.workspace_id,
      v_cand.candidate_type,
      v_cand.canonical_name,
      v_cand.normalized_name,
      v_cand.proposed_description,
      'active',
      v_cand.source_snapshot_id,
      v_primary_block,
      v_cand.extraction_model_run_id,
      v_cand.id,
      v_cand.metadata
    )
    RETURNING id INTO v_object_id;
  END IF;

  FOREACH v_alias IN ARRAY (
    ARRAY[v_cand.canonical_name] || coalesce(
      ARRAY(SELECT jsonb_array_elements_text(v_cand.proposed_aliases)),
      ARRAY[]::text[]
    )
  )
  LOOP
    v_normalized := lower(btrim(regexp_replace(v_alias, '\s+', ' ', 'g')));
    IF v_normalized = '' THEN
      CONTINUE;
    END IF;
    INSERT INTO public.knowledge_object_aliases (
      workspace_id, knowledge_object_id, alias, normalized_alias, source_snapshot_id
    ) VALUES (
      v_cand.workspace_id, v_object_id, btrim(v_alias), v_normalized, v_cand.source_snapshot_id
    )
    ON CONFLICT (workspace_id, normalized_alias) DO NOTHING;
  END LOOP;

  IF v_cand.normalized_name <> '' THEN
    INSERT INTO public.knowledge_object_aliases (
      workspace_id, knowledge_object_id, alias, normalized_alias, source_snapshot_id
    ) VALUES (
      v_cand.workspace_id, v_object_id, v_cand.canonical_name, v_cand.normalized_name, v_cand.source_snapshot_id
    )
    ON CONFLICT (workspace_id, normalized_alias) DO NOTHING;
  END IF;

  FOR v_tag IN SELECT * FROM jsonb_array_elements(v_cand.proposed_tags)
  LOOP
    SELECT t.id INTO v_tag_id
    FROM public.knowledge_tags t
    WHERE t.category = v_tag->>'category'
      AND t.canonical_name = v_tag->>'canonical_name'
    LIMIT 1;
    IF v_tag_id IS NOT NULL THEN
      INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
      VALUES (v_cand.workspace_id, v_object_id, v_tag_id)
      ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;
    END IF;
  END LOOP;

  FOR v_rel IN SELECT * FROM jsonb_array_elements(v_cand.proposed_relations)
  LOOP
    SELECT o.id INTO v_target
    FROM public.efeso_knowledge_objects o
    LEFT JOIN public.knowledge_object_aliases a ON a.knowledge_object_id = o.id
    WHERE o.workspace_id = v_cand.workspace_id
      AND o.status = 'active'
      AND (
        o.canonical_name = v_rel->>'target_name'
        OR a.alias = v_rel->>'target_name'
      )
      AND (v_rel->>'target_type' IS NULL OR o.object_type = v_rel->>'target_type')
    LIMIT 1;
    IF v_target IS NOT NULL AND v_target <> v_object_id THEN
      INSERT INTO public.knowledge_object_relations (
        workspace_id, source_object_id, target_object_id, relation_type, source_snapshot_id, status
      ) VALUES (
        v_cand.workspace_id,
        v_object_id,
        v_target,
        v_rel->>'relation_type',
        v_cand.source_snapshot_id,
        'active'
      )
      ON CONFLICT (source_object_id, target_object_id, relation_type) DO NOTHING;
    END IF;
  END LOOP;

  UPDATE public.knowledge_candidates
  SET status = 'promoted',
      promoted_at = now(),
      promoted_knowledge_object_id = v_object_id
  WHERE id = v_cand.id;

  RETURN v_object_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_knowledge_candidate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_knowledge_candidate(uuid) TO authenticated;
