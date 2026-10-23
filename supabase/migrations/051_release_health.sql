CREATE TABLE public.research_worker_heartbeats(worker_id text PRIMARY KEY,seen_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.research_worker_heartbeats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.research_worker_heartbeats FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.signal_release_integrity() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object(
  'rls',NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('external_research_runs','source_snapshots','claims','signals','efeso_fits','efeso_knowledge_objects','opportunities','workspace_authorized_emails') AND NOT c.relrowsecurity),
  'allowlist_enforced',position('workspace_authorized_emails' in pg_get_functiondef('public.is_active_workspace_member(uuid)'::regprocedure))>0,
  'ownership',to_regprocedure('public.claim_research_execution(uuid,uuid)') IS NOT NULL AND to_regprocedure('public.renew_research_execution(uuid,uuid)') IS NOT NULL,
  'fencing',EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='research_write_owner' AND tgrelid='public.claims'::regclass),
  'worker_alive',EXISTS(SELECT 1 FROM public.research_worker_heartbeats WHERE seen_at>now()-interval '20 seconds'),
  'real_knowledge',(SELECT count(*) FROM public.efeso_knowledge_objects WHERE status='active' AND coalesce(metadata->>'origin','') IN ('public_official','curated_internal','restricted_internal')),
  'demo_allowlist',(SELECT count(*) FROM public.workspace_authorized_emails WHERE email IN ('demo.member@efeso.com','demo.admin@efeso.com'))
 ) WHERE public.is_pipeline_service_role();
$$;
REVOKE ALL ON FUNCTION public.signal_release_integrity() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.signal_release_integrity() TO service_role;
