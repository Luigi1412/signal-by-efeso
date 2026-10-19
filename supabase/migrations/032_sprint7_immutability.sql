-- Historical Opportunity ledgers must not be rewritten. Status/dismissal may change.

CREATE OR REPLACE FUNCTION public.prevent_opportunity_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'opportunity signals, fits, knowledge links, rationales, and validations are immutable'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER opportunity_signals_no_update
  BEFORE UPDATE ON public.opportunity_signals
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_opportunity_ledger_mutation();

CREATE TRIGGER opportunity_signals_no_delete
  BEFORE DELETE ON public.opportunity_signals
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_opportunity_ledger_mutation();

CREATE TRIGGER opportunity_efeso_fits_no_update
  BEFORE UPDATE ON public.opportunity_efeso_fits
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_opportunity_ledger_mutation();

CREATE TRIGGER opportunity_efeso_fits_no_delete
  BEFORE DELETE ON public.opportunity_efeso_fits
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_opportunity_ledger_mutation();

CREATE TRIGGER opportunity_knowledge_objects_no_update
  BEFORE UPDATE ON public.opportunity_knowledge_objects
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_opportunity_ledger_mutation();

CREATE TRIGGER opportunity_knowledge_objects_no_delete
  BEFORE DELETE ON public.opportunity_knowledge_objects
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_opportunity_ledger_mutation();

CREATE TRIGGER opportunity_rationales_no_update
  BEFORE UPDATE ON public.opportunity_rationales
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_opportunity_ledger_mutation();

CREATE TRIGGER opportunity_rationales_no_delete
  BEFORE DELETE ON public.opportunity_rationales
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_opportunity_ledger_mutation();

CREATE TRIGGER opportunity_candidate_validations_no_update
  BEFORE UPDATE ON public.opportunity_candidate_validations
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_opportunity_ledger_mutation();

CREATE TRIGGER opportunity_candidate_validations_no_delete
  BEFORE DELETE ON public.opportunity_candidate_validations
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_opportunity_ledger_mutation();

CREATE OR REPLACE FUNCTION public.prevent_opportunity_provenance_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.origin_opportunity_candidate_id IS DISTINCT FROM OLD.origin_opportunity_candidate_id
     OR NEW.origin_model_run_id IS DISTINCT FROM OLD.origin_model_run_id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.supersedes_opportunity_id IS DISTINCT FROM OLD.supersedes_opportunity_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.summary IS DISTINCT FROM OLD.summary
     OR NEW.opportunity_type IS DISTINCT FROM OLD.opportunity_type
     OR NEW.maturity IS DISTINCT FROM OLD.maturity
     OR NEW.relevance_level IS DISTINCT FROM OLD.relevance_level
     OR NEW.urgency_level IS DISTINCT FROM OLD.urgency_level
     OR NEW.confidence_tier IS DISTINCT FROM OLD.confidence_tier
     OR NEW.assertion_mode IS DISTINCT FROM OLD.assertion_mode THEN
    RAISE EXCEPTION 'opportunity provenance is immutable'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER opportunities_provenance_guard
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_opportunity_provenance_rewrite();

CREATE OR REPLACE FUNCTION public.prevent_opportunity_candidate_payload_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.proposed_title IS DISTINCT FROM OLD.proposed_title
     OR NEW.proposed_summary IS DISTINCT FROM OLD.proposed_summary
     OR NEW.proposed_opportunity_type IS DISTINCT FROM OLD.proposed_opportunity_type
     OR NEW.proposed_maturity IS DISTINCT FROM OLD.proposed_maturity
     OR NEW.proposed_relevance_level IS DISTINCT FROM OLD.proposed_relevance_level
     OR NEW.proposed_urgency_level IS DISTINCT FROM OLD.proposed_urgency_level
     OR NEW.proposed_confidence_tier IS DISTINCT FROM OLD.proposed_confidence_tier
     OR NEW.proposed_rationale IS DISTINCT FROM OLD.proposed_rationale
     OR NEW.proposed_signal_links IS DISTINCT FROM OLD.proposed_signal_links
     OR NEW.proposed_fit_links IS DISTINCT FROM OLD.proposed_fit_links
     OR NEW.proposed_knowledge_links IS DISTINCT FROM OLD.proposed_knowledge_links
     OR NEW.proposed_rationale_blocks IS DISTINCT FROM OLD.proposed_rationale_blocks
     OR NEW.candidate_fingerprint IS DISTINCT FROM OLD.candidate_fingerprint
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION 'opportunity candidate payload is immutable'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER opportunity_candidates_payload_guard
  BEFORE UPDATE ON public.opportunity_candidates
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_opportunity_candidate_payload_rewrite();
