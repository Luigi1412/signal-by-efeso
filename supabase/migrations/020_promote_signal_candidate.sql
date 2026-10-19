-- Atomic promotion: SignalCandidate → Signal (+ claims, companies, tags, provenance).
-- SECURITY DEFINER, auth.uid() + admin membership, fixed search_path.
-- The model never promotes. Only a validated candidate with a primary claim may promote.

CREATE OR REPLACE FUNCTION public.promote_signal_candidate(p_candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_cand public.signal_candidates%ROWTYPE;
  v_signal_id uuid;
  v_primary_count integer;
  v_tag jsonb;
  v_tag_id uuid;
  v_company jsonb;
  v_company_id uuid;
  v_role text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cand
  FROM public.signal_candidates
  WHERE id = p_candidate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'signal candidate not found';
  END IF;

  IF NOT public.is_active_workspace_member(v_cand.workspace_id) THEN
    RAISE EXCEPTION 'not a workspace member' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_workspace_admin(v_cand.workspace_id) THEN
    RAISE EXCEPTION 'not a workspace admin' USING ERRCODE = '42501';
  END IF;

  IF v_cand.promoted_signal_id IS NOT NULL THEN
    IF v_cand.status <> 'promoted' THEN
      UPDATE public.signal_candidates
      SET status = 'promoted',
          promoted_at = coalesce(promoted_at, now())
      WHERE id = v_cand.id;
    END IF;
    RETURN v_cand.promoted_signal_id;
  END IF;

  IF v_cand.status = 'promoted' THEN
    RAISE EXCEPTION 'candidate marked promoted without signal';
  END IF;

  IF v_cand.status <> 'validated' THEN
    RAISE EXCEPTION 'candidate is not validated';
  END IF;

  SELECT count(*) INTO v_primary_count
  FROM public.signal_candidate_claims
  WHERE signal_candidate_id = v_cand.id
    AND relationship_type = 'primary_evidence';

  IF v_primary_count < 1 THEN
    RAISE EXCEPTION 'no primary claim';
  END IF;

  INSERT INTO public.signals (
    workspace_id,
    company_id,
    signal_type,
    signal_nature,
    title,
    summary,
    status,
    importance,
    confidence_tier,
    assertion_mode,
    event_date,
    effective_period_start,
    effective_period_end,
    geography,
    metric_name,
    numeric_value,
    unit,
    currency_code,
    signal_fingerprint,
    source_snapshot_id,
    origin_signal_candidate_id,
    origin_model_run_id,
    parent_signal_id,
    metadata
  ) VALUES (
    v_cand.workspace_id,
    v_cand.company_id,
    v_cand.proposed_signal_type,
    v_cand.proposed_signal_nature,
    v_cand.proposed_title,
    v_cand.proposed_summary,
    'active',
    v_cand.proposed_importance,
    coalesce(v_cand.proposed_confidence_tier, 'supported'),
    v_cand.proposed_assertion_mode,
    v_cand.proposed_event_date,
    v_cand.proposed_effective_period_start,
    v_cand.proposed_effective_period_end,
    v_cand.proposed_geography,
    v_cand.proposed_metric_name,
    v_cand.proposed_numeric_value,
    v_cand.proposed_unit,
    v_cand.proposed_currency_code,
    v_cand.candidate_fingerprint,
    v_cand.source_snapshot_id,
    v_cand.id,
    v_cand.extraction_model_run_id,
    v_cand.proposed_parent_signal_id,
    v_cand.metadata
  )
  RETURNING id INTO v_signal_id;

  INSERT INTO public.signal_claims (workspace_id, signal_id, claim_id, relationship_type)
  SELECT workspace_id, v_signal_id, claim_id, relationship_type
  FROM public.signal_candidate_claims
  WHERE signal_candidate_id = v_cand.id;

  INSERT INTO public.signal_companies (workspace_id, signal_id, company_id, role)
  VALUES (v_cand.workspace_id, v_signal_id, v_cand.company_id, 'primary')
  ON CONFLICT (signal_id, company_id) DO NOTHING;

  FOR v_company IN SELECT * FROM jsonb_array_elements(v_cand.proposed_companies)
  LOOP
    v_company_id := NULLIF(v_company->>'company_id', '')::uuid;
    v_role := coalesce(v_company->>'role', 'affected');
    IF v_company_id IS NULL OR v_company_id = v_cand.company_id THEN
      CONTINUE;
    END IF;
    IF v_role NOT IN ('acquirer', 'target', 'partner', 'supplier', 'customer', 'affected') THEN
      CONTINUE;
    END IF;
    INSERT INTO public.signal_companies (workspace_id, signal_id, company_id, role)
    VALUES (v_cand.workspace_id, v_signal_id, v_company_id, v_role)
    ON CONFLICT (signal_id, company_id) DO NOTHING;
  END LOOP;

  FOR v_tag IN SELECT * FROM jsonb_array_elements(v_cand.proposed_tags)
  LOOP
    SELECT t.id INTO v_tag_id
    FROM public.knowledge_tags t
    WHERE t.category = v_tag->>'category'
      AND t.canonical_name = v_tag->>'canonical_name'
    LIMIT 1;
    IF v_tag_id IS NOT NULL THEN
      INSERT INTO public.signal_tags (workspace_id, signal_id, tag_id)
      VALUES (v_cand.workspace_id, v_signal_id, v_tag_id)
      ON CONFLICT (signal_id, tag_id) DO NOTHING;
    END IF;
  END LOOP;

  UPDATE public.signal_candidates
  SET status = 'promoted',
      promoted_at = now(),
      promoted_signal_id = v_signal_id
  WHERE id = v_cand.id;

  RETURN v_signal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_signal_candidate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_signal_candidate(uuid) TO authenticated;
