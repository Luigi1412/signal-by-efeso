-- Sprint 10 — pipeline actor for External Company Research.
-- Service-role clients may promote validated candidates without a user JWT.
-- Members still cannot forge promotions: they lack GRANT on these SECURITY DEFINER
-- functions except the authenticated grants already in place, and RLS still
-- blocks table writes for pipeline internals.

CREATE OR REPLACE FUNCTION public.is_pipeline_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(auth.role(), '') = 'service_role';
$$;

CREATE OR REPLACE FUNCTION public.pipeline_actor_uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN public.is_pipeline_service_role() THEN '00000000-0000-4000-8000-000000000099'::uuid
    ELSE auth.uid()
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_active_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_pipeline_service_role()
    OR (
      p_workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.workspace_memberships m
        WHERE m.workspace_id = p_workspace_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
      )
    );
$$;

REVOKE ALL ON FUNCTION public.is_pipeline_service_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_pipeline_service_role() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.pipeline_actor_uid() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pipeline_actor_uid() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_pipeline_service_role()
    OR (
      p_workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.workspace_memberships m
        WHERE m.workspace_id = p_workspace_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
          AND m.role = 'admin'
      )
    );
$$;

-- Recreated from 012_promote_claim_candidate.sql with pipeline_actor_uid()
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
  v_user uuid := public.pipeline_actor_uid();
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

-- Recreated from 015_promote_knowledge_candidate.sql with pipeline_actor_uid()
-- Atomic promotion: KnowledgeCandidate → EfesoKnowledgeObject (+ aliases/tags).
-- SECURITY DEFINER, auth.uid() + membership, fixed search_path.

CREATE OR REPLACE FUNCTION public.promote_knowledge_candidate(p_candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := public.pipeline_actor_uid();
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

-- Recreated from 020_promote_signal_candidate.sql with pipeline_actor_uid()
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
  v_user uuid := public.pipeline_actor_uid();
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

-- Recreated from 025_promote_account_intelligence_candidate.sql with pipeline_actor_uid()
-- Atomic promotion: AccountIntelligenceCandidate → AccountIntelligence.
-- SECURITY DEFINER, admin-only. Previous active version is archived, never overwritten.

CREATE OR REPLACE FUNCTION public.promote_account_intelligence_candidate(p_candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := public.pipeline_actor_uid();
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

-- Recreated from 026_promote_efeso_fit_candidate.sql with pipeline_actor_uid()
-- Atomic promotion: EfesoFitCandidate → EfesoFit (+ components, signal-knowledge matches).
-- SECURITY DEFINER, admin-only. Previous active fit for the pair is archived.

CREATE OR REPLACE FUNCTION public.promote_efeso_fit_candidate(p_candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := public.pipeline_actor_uid();
  v_cand public.efeso_fit_candidates%ROWTYPE;
  v_fit_id uuid;
  v_prev_id uuid;
  v_next_version integer;
  v_component jsonb;
  v_match jsonb;
  v_ko_status text;
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
      v_component->>'component_type',
      v_component->>'component_value',
      coalesce((v_component->>'contribution')::integer, 0),
      v_component->>'explanation',
      coalesce(v_component->>'source_type', 'knowledge_object'),
      NULLIF(v_component->>'source_id', '')::uuid
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
      (v_match->>'signal_id')::uuid,
      v_cand.knowledge_object_id,
      v_match->>'match_type',
      coalesce(v_match->>'match_strength', 'medium'),
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

REVOKE ALL ON FUNCTION public.promote_efeso_fit_candidate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_efeso_fit_candidate(uuid) TO authenticated;

-- Recreated from 028_promote_efeso_fit_component_keys.sql with pipeline_actor_uid()
-- Accept camelCase or snake_case keys in proposed_components JSON.
-- TypeScript drafts use componentType; the RPC must persist closed component types.

CREATE OR REPLACE FUNCTION public.promote_efeso_fit_candidate(p_candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := public.pipeline_actor_uid();
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

-- Recreated from 031_promote_opportunity_candidate.sql with pipeline_actor_uid()
-- Atomic promotion: OpportunityCandidate → Opportunity + links + rationale.
-- SECURITY DEFINER, admin-only. Previous active version with the same fingerprint is archived.

CREATE OR REPLACE FUNCTION public.promote_opportunity_candidate(p_candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := public.pipeline_actor_uid();
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
  v_user uuid := public.pipeline_actor_uid();
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

-- Recreated from 035_promote_recommended_action_candidate.sql with pipeline_actor_uid()
-- Atomic promotion: RecommendedActionCandidate → RecommendedAction + links + rationale.
-- SECURITY DEFINER, admin-only. Status changes and dismissal also admin-only.

CREATE OR REPLACE FUNCTION public.promote_recommended_action_candidate(p_candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := public.pipeline_actor_uid();
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
  v_user uuid := public.pipeline_actor_uid();
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
  v_user uuid := public.pipeline_actor_uid();
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

GRANT EXECUTE ON FUNCTION public.promote_claim_candidate(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_knowledge_candidate(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_signal_candidate(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_account_intelligence_candidate(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_efeso_fit_candidate(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_opportunity_candidate(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.dismiss_opportunity(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_recommended_action_candidate(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.dismiss_recommended_action(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_recommended_action_status(uuid, text, text) TO service_role;
