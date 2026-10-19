-- Historical knowledge evidence and validation ledger must not be rewritten.

CREATE OR REPLACE FUNCTION public.prevent_knowledge_evidence_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'knowledge evidence and validations are immutable'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER knowledge_candidate_evidence_no_update
  BEFORE UPDATE ON public.knowledge_candidate_evidence
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_knowledge_evidence_mutation();

CREATE TRIGGER knowledge_candidate_evidence_no_delete
  BEFORE DELETE ON public.knowledge_candidate_evidence
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_knowledge_evidence_mutation();

CREATE TRIGGER knowledge_candidate_validations_no_update
  BEFORE UPDATE ON public.knowledge_candidate_validations
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_knowledge_evidence_mutation();

CREATE TRIGGER knowledge_candidate_validations_no_delete
  BEFORE DELETE ON public.knowledge_candidate_validations
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_knowledge_evidence_mutation();

CREATE OR REPLACE FUNCTION public.prevent_knowledge_object_provenance_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.source_snapshot_id IS DISTINCT FROM OLD.source_snapshot_id
     OR NEW.origin_model_run_id IS DISTINCT FROM OLD.origin_model_run_id
     OR NEW.origin_candidate_id IS DISTINCT FROM OLD.origin_candidate_id
     OR NEW.primary_content_block_id IS DISTINCT FROM OLD.primary_content_block_id THEN
    RAISE EXCEPTION 'knowledge object provenance is immutable'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER efeso_knowledge_objects_provenance_guard
  BEFORE UPDATE ON public.efeso_knowledge_objects
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_knowledge_object_provenance_rewrite();
