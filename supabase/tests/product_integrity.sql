-- SIGNAL Sprint 9 — product integrity: no orphan commercial objects, demo origin explicit.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(5);

SELECT is(
  (SELECT count(*)::int
     FROM public.opportunities o
    WHERE o.status = 'active'
      AND NOT EXISTS (
        SELECT 1
          FROM public.opportunity_signals os
         WHERE os.opportunity_id = o.id
           AND os.relationship_type = 'trigger'
      )),
  0,
  'no active Opportunity without trigger Signal'
);

SELECT is(
  (SELECT count(*)::int
     FROM public.recommended_actions a
    WHERE a.status = 'active'
      AND a.opportunity_id IS NULL
      AND a.action_type NOT IN ('monitor_development', 'validate_relationship', 'validate_account_context', 'no_action')),
  0,
  'no active Action without valid context'
);

SELECT is(
  (SELECT count(*)::int
     FROM public.account_relationships r
    WHERE r.relationship_strength = 'strong'
      AND r.status = 'active'
      AND (r.source_type IS NULL OR btrim(r.source_type) = '')),
  0,
  'no strong relationship without source'
);

SELECT ok(
  NOT EXISTS(SELECT 1 FROM public.signals WHERE origin_signal_candidate_id IS NULL AND coalesce(metadata->>'origin','') <> 'demo_seed'),
  'demo Signals are marked demo_seed'
);

SELECT ok(
  NOT EXISTS(SELECT 1 FROM public.opportunities WHERE origin_opportunity_candidate_id IS NULL AND coalesce(metadata->>'origin','') <> 'demo_seed')
  AND NOT EXISTS(SELECT 1 FROM public.recommended_actions WHERE origin_action_candidate_id IS NULL AND coalesce(metadata->>'origin','') <> 'demo_seed'),
  'demo Opportunities and Actions are marked demo_seed'
);

SELECT * FROM finish();
ROLLBACK;
