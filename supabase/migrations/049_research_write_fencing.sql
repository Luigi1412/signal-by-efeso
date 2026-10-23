-- PostgREST request headers bind every pipeline write to the acquired lease token.
-- This stops a paused/stale process from publishing after another worker owns the run.
CREATE FUNCTION public.enforce_research_write_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE h jsonb; r public.external_research_runs%ROWTYPE; target jsonb;
BEGIN
  h := coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
  IF h->>'x-signal-run' IS NULL THEN RETURN NEW; END IF; -- Explicit admin/lab operations have their own authorization.
  SELECT * INTO r FROM public.external_research_runs WHERE id=(h->>'x-signal-run')::uuid;
  IF NOT FOUND OR r.worker_id IS DISTINCT FROM h->>'x-signal-owner'
    OR r.worker_lock_until IS NULL OR r.worker_lock_until <= clock_timestamp()
    OR r.status='cancelled'
    OR (r.status IN ('failed','partial','completed','needs_user_resolution') AND TG_TABLE_NAME<>'external_research_events')
    OR NOT EXISTS(SELECT 1 FROM public.research_execution_slot WHERE id AND run_id=r.id
      AND owner::text=h->>'x-signal-owner' AND lease_until>clock_timestamp())
  THEN RAISE EXCEPTION 'research ownership lost' USING ERRCODE='42501'; END IF;
  target := to_jsonb(NEW);
  IF target ? 'workspace_id' AND target->>'workspace_id' IS DISTINCT FROM r.workspace_id::text
  THEN RAISE EXCEPTION 'research workspace mismatch' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['external_research_runs','external_source_candidates','external_research_events',
    'companies','company_aliases','analyses','research_runs','sources','source_snapshots','research_run_sources',
    'source_content_blocks','model_runs','claim_candidates','claim_candidate_evidence','claim_candidate_validations',
    'claims','evidence_fragments','claim_evidence','signal_candidates','signal_candidate_claims','signal_candidate_validations',
    'signals','signal_claims','signal_tags','account_intelligence_candidates','account_intelligence_candidate_validations',
    'account_intelligence','account_intelligence_signals','account_intelligence_themes','account_tensions',
    'efeso_fit_candidates','efeso_fit_candidate_validations','efeso_fits','efeso_fit_components','signal_knowledge_matches',
    'opportunity_candidates','opportunity_candidate_validations','opportunities','opportunity_signals',
    'opportunity_efeso_fits','opportunity_knowledge_objects','opportunity_rationales',
    'recommended_action_candidates','recommended_action_candidate_validations','recommended_actions',
    'recommended_action_opportunities','recommended_action_knowledge_objects','recommended_action_rationales']
  LOOP
    EXECUTE format('CREATE TRIGGER research_write_owner BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_research_write_owner()',t);
  END LOOP;
END $$;
