-- SIGNAL Sprint 9 — CEO demo dataset coherence (Vale journey + Natura/Raízen minimum).
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(14);

SELECT ok(
  (SELECT count(*) FROM public.signals
    WHERE company_id = 'a1000000-0000-4000-8000-000000000002' AND status = 'active') > 0,
  'Vale has active Signals'
);

SELECT ok(
  (SELECT count(*) FROM public.account_intelligence
    WHERE company_id = 'a1000000-0000-4000-8000-000000000002' AND status = 'active') > 0,
  'Vale has Account Intelligence'
);

SELECT ok(
  (SELECT count(*) FROM public.efeso_fits
    WHERE company_id = 'a1000000-0000-4000-8000-000000000002'
      AND status = 'active'
      AND fit_level = 'high') > 0,
  'Vale has high EFESO Fit'
);

SELECT ok(
  (SELECT count(*) FROM public.opportunities
    WHERE company_id = 'a1000000-0000-4000-8000-000000000002' AND status = 'active') > 0,
  'Vale has Opportunity'
);

SELECT ok(
  (SELECT count(*) FROM public.account_relationships
    WHERE company_id = 'a1000000-0000-4000-8000-000000000002' AND status = 'active') > 0,
  'Vale has Relationship'
);

SELECT ok(
  (SELECT count(*) FROM public.recommended_actions
    WHERE company_id = 'a1000000-0000-4000-8000-000000000002' AND status = 'active') > 0,
  'Vale has Recommended Action'
);

SELECT ok(
  (SELECT count(*)
     FROM public.signal_claims sc
     JOIN public.signals s ON s.id = sc.signal_id
    WHERE s.company_id = 'a1000000-0000-4000-8000-000000000002'
      AND s.status = 'active') > 0,
  'Vale Signals have Evidence/Claims'
);

SELECT ok(
  (SELECT count(*) FROM public.signals
    WHERE company_id = 'a1000000-0000-4000-8000-000000000001' AND status = 'active') > 0,
  'Natura has active Signals'
);

SELECT ok(
  (SELECT count(*) FROM public.opportunities
    WHERE company_id = 'a1000000-0000-4000-8000-000000000001' AND status = 'active') > 0,
  'Natura has Opportunity'
);

SELECT ok(
  (SELECT count(*) FROM public.account_intelligence
    WHERE company_id = 'a1000000-0000-4000-8000-000000000001' AND status = 'active') > 0,
  'Natura has Account Intelligence'
);

SELECT ok(
  (SELECT count(*) FROM public.signals
    WHERE company_id = 'a1000000-0000-4000-8000-000000000003' AND status = 'active') > 0,
  'Raízen has active Signals'
);

SELECT ok(
  (SELECT count(*) FROM public.opportunities
    WHERE company_id = 'a1000000-0000-4000-8000-000000000003' AND status = 'active') > 0,
  'Raízen has Opportunity'
);

SELECT ok(
  (SELECT count(*) FROM public.account_relationships
    WHERE company_id = 'a1000000-0000-4000-8000-000000000003' AND status = 'active') > 0,
  'Raízen has Relationship context'
);

SELECT ok(
  (SELECT count(*) FROM public.recommended_actions
    WHERE company_id IN (
      'a1000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000003'
    ) AND status = 'active') > 0,
  'Natura or Raízen has at least one Recommended Action'
);

SELECT * FROM finish();
ROLLBACK;
