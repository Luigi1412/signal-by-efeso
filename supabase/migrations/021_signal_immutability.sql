-- Historical signal claim links, candidate payload, and validation ledger must not be rewritten.

CREATE OR REPLACE FUNCTION public.prevent_signal_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'signal claims, candidate claims, and validations are immutable'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER signal_candidate_claims_no_update
  BEFORE UPDATE ON public.signal_candidate_claims
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_signal_ledger_mutation();

CREATE TRIGGER signal_candidate_claims_no_delete
  BEFORE DELETE ON public.signal_candidate_claims
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_signal_ledger_mutation();

CREATE TRIGGER signal_candidate_validations_no_update
  BEFORE UPDATE ON public.signal_candidate_validations
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_signal_ledger_mutation();

CREATE TRIGGER signal_candidate_validations_no_delete
  BEFORE DELETE ON public.signal_candidate_validations
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_signal_ledger_mutation();

CREATE TRIGGER signal_claims_no_update
  BEFORE UPDATE ON public.signal_claims
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_signal_ledger_mutation();

CREATE TRIGGER signal_claims_no_delete
  BEFORE DELETE ON public.signal_claims
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_signal_ledger_mutation();

CREATE OR REPLACE FUNCTION public.prevent_signal_provenance_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.origin_signal_candidate_id IS DISTINCT FROM OLD.origin_signal_candidate_id
     OR NEW.origin_model_run_id IS DISTINCT FROM OLD.origin_model_run_id
     OR NEW.signal_fingerprint IS DISTINCT FROM OLD.signal_fingerprint
     OR NEW.source_snapshot_id IS DISTINCT FROM OLD.source_snapshot_id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'signal provenance is immutable'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER signals_provenance_guard
  BEFORE UPDATE ON public.signals
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_signal_provenance_rewrite();

CREATE OR REPLACE FUNCTION public.prevent_signal_candidate_payload_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.proposed_signal_type IS DISTINCT FROM OLD.proposed_signal_type
     OR NEW.proposed_title IS DISTINCT FROM OLD.proposed_title
     OR NEW.proposed_summary IS DISTINCT FROM OLD.proposed_summary
     OR NEW.proposed_assertion_mode IS DISTINCT FROM OLD.proposed_assertion_mode
     OR NEW.proposed_core_event IS DISTINCT FROM OLD.proposed_core_event
     OR NEW.candidate_fingerprint IS DISTINCT FROM OLD.candidate_fingerprint
     OR NEW.extraction_model_run_id IS DISTINCT FROM OLD.extraction_model_run_id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION 'signal candidate payload is immutable'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER signal_candidates_payload_guard
  BEFORE UPDATE ON public.signal_candidates
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_signal_candidate_payload_rewrite();
