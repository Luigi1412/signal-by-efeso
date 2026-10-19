ALTER TABLE public.claim_candidates
  DROP CONSTRAINT IF EXISTS claim_candidates_fingerprint_unique;

ALTER TABLE public.claim_candidates
  ADD CONSTRAINT claim_candidates_fingerprint_unique
  UNIQUE (analysis_id, source_snapshot_id, candidate_fingerprint);
