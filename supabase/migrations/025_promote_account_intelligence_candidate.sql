-- Atomic promotion: AccountIntelligenceCandidate → AccountIntelligence.
-- SECURITY DEFINER, admin-only. Previous active version is archived, never overwritten.

CREATE OR REPLACE FUNCTION public.promote_account_intelligence_candidate(p_candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_cand public.account_intelligence_candidates%ROWTYPE;
  v_ai_id uuid;
  v_prev_id uuid;
  v_next_version integer;
  v_link jsonb;
  v_tension jsonb;
  v_theme jsonb;
  v_tag_id uuid;
  v_signal_id uuid;
  v_signal_status text;
  v_signal_company uuid;
  v_inactive integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cand
  FROM public.account_intelligence_candidates
  WHERE id = p_candidate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'account intelligence candidate not found';
  END IF;

  IF NOT public.is_active_workspace_member(v_cand.workspace_id) THEN
    RAISE EXCEPTION 'not a workspace member' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_workspace_admin(v_cand.workspace_id) THEN
    RAISE EXCEPTION 'not a workspace admin' USING ERRCODE = '42501';
  END IF;

  IF v_cand.promoted_account_intelligence_id IS NOT NULL THEN
    IF v_cand.status <> 'promoted' THEN
      UPDATE public.account_intelligence_candidates
      SET status = 'promoted',
          promoted_at = coalesce(promoted_at, now())
      WHERE id = v_cand.id;
    END IF;
    RETURN v_cand.promoted_account_intelligence_id;
  END IF;

  IF v_cand.status = 'promoted' THEN
    RAISE EXCEPTION 'candidate marked promoted without account intelligence';
  END IF;

  IF v_cand.status <> 'validated' THEN
    RAISE EXCEPTION 'candidate is not validated';
  END IF;

  SELECT count(*) INTO v_inactive
  FROM jsonb_array_elements(v_cand.proposed_signal_links) AS link
  JOIN public.signals s ON s.id = (link->>'signal_id')::uuid
  WHERE s.status <> 'active' OR s.workspace_id <> v_cand.workspace_id OR s.company_id <> v_cand.company_id;

  IF v_inactive > 0 THEN
    RAISE EXCEPTION 'candidate references inactive or inconsistent signals';
  END IF;

  SELECT id, version INTO v_prev_id, v_next_version
  FROM public.account_intelligence
  WHERE workspace_id = v_cand.workspace_id
    AND company_id = v_cand.company_id
    AND status = 'active'
  FOR UPDATE;

  IF v_prev_id IS NOT NULL THEN
    UPDATE public.account_intelligence
    SET status = 'archived'
    WHERE id = v_prev_id;
    v_next_version := v_next_version + 1;
  ELSE
    v_next_version := greatest(v_cand.version, 1);
  END IF;

  INSERT INTO public.account_intelligence (
    workspace_id,
    company_id,
    status,
    generated_at,
    period_start,
    period_end,
    headline,
    executive_summary,
    strategic_direction,
    pressure_summary,
    investment_summary,
    operating_context_summary,
    risk_summary,
    change_summary,
    sections,
    origin_model_run_id,
    origin_candidate_id,
    version,
    supersedes_account_intelligence_id,
    metadata
  ) VALUES (
    v_cand.workspace_id,
    v_cand.company_id,
    'active',
    now(),
    v_cand.proposed_period_start,
    v_cand.proposed_period_end,
    v_cand.proposed_headline,
    v_cand.proposed_executive_summary,
    v_cand.proposed_strategic_direction,
    v_cand.proposed_pressure_summary,
    v_cand.proposed_investment_summary,
    v_cand.proposed_operating_context_summary,
    v_cand.proposed_risk_summary,
    v_cand.proposed_change_summary,
    v_cand.proposed_sections,
    v_cand.extraction_model_run_id,
    v_cand.id,
    v_next_version,
    v_prev_id,
    v_cand.metadata
  )
  RETURNING id INTO v_ai_id;

  FOR v_link IN SELECT * FROM jsonb_array_elements(v_cand.proposed_signal_links)
  LOOP
    v_signal_id := NULLIF(v_link->>'signal_id', '')::uuid;
    IF v_signal_id IS NULL THEN
      CONTINUE;
    END IF;
    SELECT status, company_id INTO v_signal_status, v_signal_company
    FROM public.signals
    WHERE id = v_signal_id AND workspace_id = v_cand.workspace_id;
    IF v_signal_status IS DISTINCT FROM 'active' OR v_signal_company IS DISTINCT FROM v_cand.company_id THEN
      RAISE EXCEPTION 'candidate references inactive or inconsistent signals';
    END IF;
    INSERT INTO public.account_intelligence_signals (
      workspace_id, account_intelligence_id, signal_id, relationship_type, weight
    ) VALUES (
      v_cand.workspace_id,
      v_ai_id,
      v_signal_id,
      coalesce(v_link->>'relationship_type', 'supporting'),
      coalesce((v_link->>'weight')::integer, 1)
    )
    ON CONFLICT (account_intelligence_id, signal_id) DO NOTHING;
  END LOOP;

  FOR v_tension IN SELECT * FROM jsonb_array_elements(v_cand.proposed_tensions)
  LOOP
    INSERT INTO public.account_tensions (
      workspace_id,
      account_intelligence_id,
      signal_a_id,
      signal_b_id,
      tension_type,
      explanation,
      status
    ) VALUES (
      v_cand.workspace_id,
      v_ai_id,
      (v_tension->>'signal_a_id')::uuid,
      (v_tension->>'signal_b_id')::uuid,
      v_tension->>'tension_type',
      v_tension->>'explanation',
      CASE WHEN v_tension->>'tension_type' = 'other' THEN 'needs_review' ELSE 'active' END
    )
    ON CONFLICT (account_intelligence_id, signal_a_id, signal_b_id, tension_type) DO NOTHING;
  END LOOP;

  FOR v_theme IN SELECT * FROM jsonb_array_elements(v_cand.proposed_themes)
  LOOP
    v_tag_id := NULLIF(v_theme->>'tag_id', '')::uuid;
    IF v_tag_id IS NULL THEN
      SELECT t.id INTO v_tag_id
      FROM public.knowledge_tags t
      WHERE t.category = v_theme->>'category'
        AND t.canonical_name = v_theme->>'canonical_name'
      LIMIT 1;
    END IF;
    IF v_tag_id IS NULL THEN
      CONTINUE;
    END IF;
    INSERT INTO public.account_intelligence_themes (
      workspace_id,
      account_intelligence_id,
      tag_id,
      signal_count,
      weighted_importance,
      last_seen_at
    ) VALUES (
      v_cand.workspace_id,
      v_ai_id,
      v_tag_id,
      coalesce((v_theme->>'signal_count')::integer, 1),
      coalesce(v_theme->>'weighted_importance', 'medium'),
      NULLIF(v_theme->>'last_seen_at', '')::timestamptz
    )
    ON CONFLICT (account_intelligence_id, tag_id) DO NOTHING;
  END LOOP;

  UPDATE public.account_intelligence_candidates
  SET status = 'promoted',
      promoted_at = now(),
      promoted_account_intelligence_id = v_ai_id
  WHERE id = v_cand.id;

  RETURN v_ai_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_account_intelligence_candidate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_account_intelligence_candidate(uuid) TO authenticated;
