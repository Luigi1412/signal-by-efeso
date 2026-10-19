-- Historical Account Intelligence / EFESO Fit ledgers must not be rewritten.

CREATE OR REPLACE FUNCTION public.prevent_account_intelligence_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'account intelligence signals, tensions, themes, and validations are immutable'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER account_intelligence_signals_no_update
  BEFORE UPDATE ON public.account_intelligence_signals
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_account_intelligence_ledger_mutation();

CREATE TRIGGER account_intelligence_signals_no_delete
  BEFORE DELETE ON public.account_intelligence_signals
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_account_intelligence_ledger_mutation();

CREATE TRIGGER account_tensions_no_update
  BEFORE UPDATE ON public.account_tensions
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_account_intelligence_ledger_mutation();

CREATE TRIGGER account_tensions_no_delete
  BEFORE DELETE ON public.account_tensions
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_account_intelligence_ledger_mutation();

CREATE TRIGGER account_intelligence_themes_no_update
  BEFORE UPDATE ON public.account_intelligence_themes
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_account_intelligence_ledger_mutation();

CREATE TRIGGER account_intelligence_themes_no_delete
  BEFORE DELETE ON public.account_intelligence_themes
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_account_intelligence_ledger_mutation();

CREATE TRIGGER account_intelligence_candidate_validations_no_update
  BEFORE UPDATE ON public.account_intelligence_candidate_validations
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_account_intelligence_ledger_mutation();

CREATE TRIGGER account_intelligence_candidate_validations_no_delete
  BEFORE DELETE ON public.account_intelligence_candidate_validations
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_account_intelligence_ledger_mutation();

CREATE OR REPLACE FUNCTION public.prevent_account_intelligence_provenance_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.origin_candidate_id IS DISTINCT FROM OLD.origin_candidate_id
     OR NEW.origin_model_run_id IS DISTINCT FROM OLD.origin_model_run_id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.supersedes_account_intelligence_id IS DISTINCT FROM OLD.supersedes_account_intelligence_id
     OR NEW.headline IS DISTINCT FROM OLD.headline
     OR NEW.executive_summary IS DISTINCT FROM OLD.executive_summary THEN
    RAISE EXCEPTION 'account intelligence provenance is immutable'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER account_intelligence_provenance_guard
  BEFORE UPDATE ON public.account_intelligence
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_account_intelligence_provenance_rewrite();

CREATE OR REPLACE FUNCTION public.prevent_account_intelligence_candidate_payload_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.proposed_headline IS DISTINCT FROM OLD.proposed_headline
     OR NEW.proposed_executive_summary IS DISTINCT FROM OLD.proposed_executive_summary
     OR NEW.proposed_sections IS DISTINCT FROM OLD.proposed_sections
     OR NEW.candidate_fingerprint IS DISTINCT FROM OLD.candidate_fingerprint
     OR NEW.extraction_model_run_id IS DISTINCT FROM OLD.extraction_model_run_id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION 'account intelligence candidate payload is immutable'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER account_intelligence_candidates_payload_guard
  BEFORE UPDATE ON public.account_intelligence_candidates
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_account_intelligence_candidate_payload_rewrite();

CREATE OR REPLACE FUNCTION public.prevent_efeso_fit_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'efeso fit components, matches, and validations are immutable'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER efeso_fit_components_no_update
  BEFORE UPDATE ON public.efeso_fit_components
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_efeso_fit_ledger_mutation();

CREATE TRIGGER efeso_fit_components_no_delete
  BEFORE DELETE ON public.efeso_fit_components
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_efeso_fit_ledger_mutation();

CREATE TRIGGER efeso_fit_candidate_validations_no_update
  BEFORE UPDATE ON public.efeso_fit_candidate_validations
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_efeso_fit_ledger_mutation();

CREATE TRIGGER efeso_fit_candidate_validations_no_delete
  BEFORE DELETE ON public.efeso_fit_candidate_validations
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_efeso_fit_ledger_mutation();

CREATE OR REPLACE FUNCTION public.prevent_efeso_fit_provenance_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.origin_candidate_id IS DISTINCT FROM OLD.origin_candidate_id
     OR NEW.origin_model_run_id IS DISTINCT FROM OLD.origin_model_run_id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.knowledge_object_id IS DISTINCT FROM OLD.knowledge_object_id
     OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.supersedes_fit_id IS DISTINCT FROM OLD.supersedes_fit_id
     OR NEW.fit_level IS DISTINCT FROM OLD.fit_level
     OR NEW.fit_score IS DISTINCT FROM OLD.fit_score THEN
    RAISE EXCEPTION 'efeso fit provenance is immutable'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER efeso_fits_provenance_guard
  BEFORE UPDATE ON public.efeso_fits
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_efeso_fit_provenance_rewrite();

CREATE OR REPLACE FUNCTION public.prevent_efeso_fit_candidate_payload_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.proposed_components IS DISTINCT FROM OLD.proposed_components
     OR NEW.proposed_rationale IS DISTINCT FROM OLD.proposed_rationale
     OR NEW.proposed_fit_level IS DISTINCT FROM OLD.proposed_fit_level
     OR NEW.proposed_fit_score IS DISTINCT FROM OLD.proposed_fit_score
     OR NEW.candidate_fingerprint IS DISTINCT FROM OLD.candidate_fingerprint
     OR NEW.knowledge_object_id IS DISTINCT FROM OLD.knowledge_object_id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION 'efeso fit candidate payload is immutable'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER efeso_fit_candidates_payload_guard
  BEFORE UPDATE ON public.efeso_fit_candidates
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_efeso_fit_candidate_payload_rewrite();
