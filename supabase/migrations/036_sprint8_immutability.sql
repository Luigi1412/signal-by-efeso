-- Historical relationship contacts and action ledgers must not be rewritten.
-- AccountRelationship status/summary may change via a new version; provenance stays.

CREATE OR REPLACE FUNCTION public.prevent_relationship_action_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'relationship contacts, action links, rationales, validations, and events are immutable'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER company_relationship_contacts_no_delete
  BEFORE DELETE ON public.company_relationship_contacts
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_relationship_action_ledger_mutation();

CREATE OR REPLACE FUNCTION public.prevent_company_relationship_contact_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.relationship_person_id IS DISTINCT FROM OLD.relationship_person_id
     OR NEW.relationship_role IS DISTINCT FROM OLD.relationship_role
     OR NEW.strength IS DISTINCT FROM OLD.strength
     OR NEW.source_type IS DISTINCT FROM OLD.source_type
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'company relationship contact provenance is immutable'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER company_relationship_contacts_provenance_guard
  BEFORE UPDATE ON public.company_relationship_contacts
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_company_relationship_contact_rewrite();

CREATE TRIGGER recommended_action_opportunities_no_update
  BEFORE UPDATE ON public.recommended_action_opportunities
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_relationship_action_ledger_mutation();

CREATE TRIGGER recommended_action_opportunities_no_delete
  BEFORE DELETE ON public.recommended_action_opportunities
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_relationship_action_ledger_mutation();

CREATE TRIGGER recommended_action_relationships_no_update
  BEFORE UPDATE ON public.recommended_action_relationships
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_relationship_action_ledger_mutation();

CREATE TRIGGER recommended_action_relationships_no_delete
  BEFORE DELETE ON public.recommended_action_relationships
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_relationship_action_ledger_mutation();

CREATE TRIGGER recommended_action_knowledge_objects_no_update
  BEFORE UPDATE ON public.recommended_action_knowledge_objects
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_relationship_action_ledger_mutation();

CREATE TRIGGER recommended_action_knowledge_objects_no_delete
  BEFORE DELETE ON public.recommended_action_knowledge_objects
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_relationship_action_ledger_mutation();

CREATE TRIGGER recommended_action_rationales_no_update
  BEFORE UPDATE ON public.recommended_action_rationales
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_relationship_action_ledger_mutation();

CREATE TRIGGER recommended_action_rationales_no_delete
  BEFORE DELETE ON public.recommended_action_rationales
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_relationship_action_ledger_mutation();

CREATE TRIGGER recommended_action_events_no_update
  BEFORE UPDATE ON public.recommended_action_events
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_relationship_action_ledger_mutation();

CREATE TRIGGER recommended_action_events_no_delete
  BEFORE DELETE ON public.recommended_action_events
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_relationship_action_ledger_mutation();

CREATE TRIGGER recommended_action_candidate_validations_no_update
  BEFORE UPDATE ON public.recommended_action_candidate_validations
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_relationship_action_ledger_mutation();

CREATE TRIGGER recommended_action_candidate_validations_no_delete
  BEFORE DELETE ON public.recommended_action_candidate_validations
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_relationship_action_ledger_mutation();

CREATE OR REPLACE FUNCTION public.prevent_account_relationship_provenance_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.supersedes_relationship_id IS DISTINCT FROM OLD.supersedes_relationship_id
     OR NEW.source_type IS DISTINCT FROM OLD.source_type
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'account relationship provenance is immutable'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER account_relationships_provenance_guard
  BEFORE UPDATE ON public.account_relationships
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_account_relationship_provenance_rewrite();

CREATE OR REPLACE FUNCTION public.prevent_recommended_action_provenance_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.origin_action_candidate_id IS DISTINCT FROM OLD.origin_action_candidate_id
     OR NEW.origin_model_run_id IS DISTINCT FROM OLD.origin_model_run_id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.supersedes_action_id IS DISTINCT FROM OLD.supersedes_action_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.rationale IS DISTINCT FROM OLD.rationale
     OR NEW.action_type IS DISTINCT FROM OLD.action_type
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.confidence_tier IS DISTINCT FROM OLD.confidence_tier THEN
    RAISE EXCEPTION 'recommended action provenance is immutable'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recommended_actions_provenance_guard
  BEFORE UPDATE ON public.recommended_actions
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_recommended_action_provenance_rewrite();

CREATE OR REPLACE FUNCTION public.prevent_recommended_action_candidate_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.proposed_title IS DISTINCT FROM OLD.proposed_title
     OR NEW.proposed_rationale IS DISTINCT FROM OLD.proposed_rationale
     OR NEW.proposed_action_type IS DISTINCT FROM OLD.proposed_action_type
     OR NEW.candidate_fingerprint IS DISTINCT FROM OLD.candidate_fingerprint THEN
    RAISE EXCEPTION 'recommended action candidate payload is immutable'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recommended_action_candidates_payload_guard
  BEFORE UPDATE ON public.recommended_action_candidates
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_recommended_action_candidate_rewrite();
