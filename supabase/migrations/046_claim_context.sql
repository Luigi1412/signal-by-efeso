ALTER TABLE public.claim_candidates ADD COLUMN entity_relationship text NOT NULL DEFAULT 'unresolved',
  ADD COLUMN operational_theme text;
ALTER TABLE public.claims ADD COLUMN entity_relationship text NOT NULL DEFAULT 'unresolved',
  ADD COLUMN operational_theme text;
ALTER TABLE public.claim_candidates ADD CONSTRAINT claim_candidate_relationship_check CHECK(entity_relationship IN ('company','parent','subsidiary','brand','unresolved'));
ALTER TABLE public.claims ADD CONSTRAINT claim_relationship_check CHECK(entity_relationship IN ('company','parent','subsidiary','brand','unresolved'));
CREATE FUNCTION public.copy_claim_context() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.origin_claim_candidate_id IS NOT NULL THEN
    SELECT entity_relationship,operational_theme,model_extraction_confidence
      INTO NEW.entity_relationship,NEW.operational_theme,NEW.confidence_score
      FROM public.claim_candidates WHERE id=NEW.origin_claim_candidate_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER copy_claim_context BEFORE INSERT ON public.claims FOR EACH ROW EXECUTE FUNCTION public.copy_claim_context();
