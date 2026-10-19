-- Atomic promotion: Candidate → EvidenceFragment + Claim + ClaimEvidence.
-- SECURITY DEFINER so pipeline tables (no authenticated UPDATE) can be updated.
-- Validates auth.uid() and active workspace membership. Fixed search_path.

CREATE OR REPLACE FUNCTION public.promote_claim_candidate(p_candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_cand public.claim_candidates%ROWTYPE;
  v_analysis public.analyses%ROWTYPE;
  v_claim_id uuid;
  v_existing uuid;
  v_cite record;
  v_fragment_id uuid;
  v_fragment_type text;
  v_support_count integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cand
  FROM public.claim_candidates
  WHERE id = p_candidate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidate not found';
  END IF;

  IF NOT public.is_active_workspace_member(v_cand.workspace_id) THEN
    RAISE EXCEPTION 'not a workspace member' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_existing
  FROM public.claims
  WHERE origin_claim_candidate_id = v_cand.id;

  IF v_existing IS NOT NULL THEN
    IF v_cand.status <> 'promoted' THEN
      UPDATE public.claim_candidates
      SET status = 'promoted',
          promoted_at = coalesce(promoted_at, now())
      WHERE id = v_cand.id;
    END IF;
    RETURN v_existing;
  END IF;

  IF v_cand.status = 'promoted' THEN
    RAISE EXCEPTION 'candidate marked promoted without claim';
  END IF;

  IF v_cand.status <> 'validated' THEN
    RAISE EXCEPTION 'candidate is not validated';
  END IF;

  IF v_cand.claim_type <> 'fact' THEN
    RAISE EXCEPTION 'only fact candidates can be promoted';
  END IF;

  SELECT count(*) INTO v_support_count
  FROM public.claim_candidate_evidence
  WHERE claim_candidate_id = v_cand.id
    AND relationship = 'supports';

  IF v_support_count < 1 THEN
    RAISE EXCEPTION 'no supporting citation';
  END IF;

  SELECT * INTO v_analysis
  FROM public.analyses
  WHERE id = v_cand.analysis_id
    AND workspace_id = v_cand.workspace_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'analysis not found';
  END IF;

  INSERT INTO public.claims (
    workspace_id,
    analysis_id,
    originating_research_run_id,
    company_id,
    entity_id,
    statement,
    claim_category,
    claim_type,
    assertion_mode,
    verification_status,
    review_status,
    claim_status,
    geography_level,
    country_code,
    state_region,
    city,
    period_type,
    period_start,
    period_end,
    as_of_date,
    metric_name,
    numeric_value,
    unit,
    currency_code,
    scale,
    origin_claim_candidate_id
  ) VALUES (
    v_cand.workspace_id,
    v_cand.analysis_id,
    v_cand.research_run_id,
    v_analysis.company_id,
    v_cand.entity_id,
    v_cand.proposed_statement,
    v_cand.claim_category,
    'fact',
    v_cand.assertion_mode,
    'supported',
    'pending',
    'active',
    v_cand.geography_level,
    v_cand.country_code,
    v_cand.state_region,
    v_cand.city,
    v_cand.period_type,
    v_cand.period_start,
    v_cand.period_end,
    v_cand.as_of_date,
    v_cand.metric_name,
    v_cand.numeric_value,
    v_cand.unit,
    v_cand.currency_code,
    v_cand.scale,
    v_cand.id
  )
  RETURNING id INTO v_claim_id;

  FOR v_cite IN
    SELECT
      e.exact_quote,
      e.char_start,
      e.char_end,
      e.source_content_block_id,
      e.source_snapshot_id,
      b.block_type,
      b.page_number,
      b.section_title
    FROM public.claim_candidate_evidence e
    JOIN public.source_content_blocks b ON b.id = e.source_content_block_id
    WHERE e.claim_candidate_id = v_cand.id
      AND e.relationship = 'supports'
    ORDER BY e.citation_order, e.created_at
  LOOP
    v_fragment_type := CASE v_cite.block_type
      WHEN 'heading' THEN 'headline'
      WHEN 'table' THEN 'table_row'
      WHEN 'caption' THEN 'caption'
      WHEN 'list' THEN 'paragraph'
      ELSE 'paragraph'
    END;

    INSERT INTO public.evidence_fragments (
      workspace_id,
      source_snapshot_id,
      source_content_block_id,
      fragment_type,
      excerpt,
      page_number,
      section_title,
      char_start,
      char_end,
      extraction_method
    ) VALUES (
      v_cand.workspace_id,
      v_cite.source_snapshot_id,
      v_cite.source_content_block_id,
      v_fragment_type,
      v_cite.exact_quote,
      v_cite.page_number,
      v_cite.section_title,
      v_cite.char_start,
      v_cite.char_end,
      'llm'
    )
    RETURNING id INTO v_fragment_id;

    INSERT INTO public.claim_evidence (
      workspace_id,
      claim_id,
      evidence_fragment_id,
      relationship,
      directness
    ) VALUES (
      v_cand.workspace_id,
      v_claim_id,
      v_fragment_id,
      'supports',
      'direct'
    );
  END LOOP;

  UPDATE public.claim_candidates
  SET status = 'promoted',
      promoted_at = now()
  WHERE id = v_cand.id;

  RETURN v_claim_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_claim_candidate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_claim_candidate(uuid) TO authenticated;
