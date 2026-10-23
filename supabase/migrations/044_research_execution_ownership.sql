-- One heavy research phase across worker processes. Web only queues/reads/cancels.
CREATE TABLE public.research_execution_slot (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  run_id uuid REFERENCES public.external_research_runs(id) ON DELETE SET NULL,
  owner uuid,
  lease_until timestamptz
);
INSERT INTO public.research_execution_slot(id) VALUES (true);
ALTER TABLE public.research_execution_slot ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.research_execution_slot FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.claim_research_execution(p_run_id uuid, p_owner uuid)
RETURNS SETOF public.external_research_runs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.external_research_runs%ROWTYPE;
BEGIN
  IF NOT public.is_pipeline_service_role() THEN RAISE EXCEPTION 'service role required'; END IF;
  -- Lock ordering is always slot, then run; both changes commit atomically.
  PERFORM 1 FROM public.research_execution_slot WHERE id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.research_execution_slot
    WHERE id AND owner IS NOT NULL AND lease_until > clock_timestamp()) THEN RETURN; END IF;
  SELECT * INTO r FROM public.external_research_runs WHERE id = p_run_id FOR UPDATE;
  IF NOT FOUND OR r.status NOT IN ('queued','resolving_entity','discovering_sources','reviewing_sources',
    'ingesting_sources','extracting_claims','generating_signals','generating_intelligence',
    'generating_opportunities','generating_actions') THEN RETURN; END IF;
  IF r.worker_id IS NOT NULL AND r.worker_lock_until > clock_timestamp() THEN RETURN; END IF;
  UPDATE public.research_execution_slot SET run_id=p_run_id, owner=p_owner,
    lease_until=clock_timestamp()+interval '30 seconds' WHERE id;
  RETURN QUERY UPDATE public.external_research_runs SET worker_id=p_owner::text,
    worker_lock_until=clock_timestamp()+interval '30 seconds', worker_heartbeat_at=clock_timestamp()
    WHERE id=p_run_id RETURNING *;
END $$;

CREATE FUNCTION public.renew_research_execution(p_run_id uuid, p_owner uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_pipeline_service_role() THEN RAISE EXCEPTION 'service role required'; END IF;
  PERFORM 1 FROM public.research_execution_slot WHERE id FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM public.research_execution_slot WHERE id AND run_id=p_run_id
    AND owner=p_owner AND lease_until > clock_timestamp()) THEN RETURN false; END IF;
  UPDATE public.external_research_runs SET worker_lock_until=clock_timestamp()+interval '30 seconds',
    worker_heartbeat_at=clock_timestamp() WHERE id=p_run_id AND worker_id=p_owner::text
    AND status NOT IN ('cancelled','failed','partial','completed','needs_user_resolution');
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.research_execution_slot SET lease_until=clock_timestamp()+interval '30 seconds' WHERE id;
  RETURN true;
END $$;

CREATE FUNCTION public.release_research_execution(p_run_id uuid, p_owner uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_pipeline_service_role() THEN RAISE EXCEPTION 'service role required'; END IF;
  UPDATE public.research_execution_slot SET run_id=NULL, owner=NULL, lease_until=NULL
    WHERE id AND owner=p_owner AND run_id=p_run_id;
  UPDATE public.external_research_runs SET worker_id=NULL,worker_lock_until=NULL
    WHERE id=p_run_id AND worker_id=p_owner::text;
END $$;
REVOKE ALL ON FUNCTION public.claim_research_execution(uuid,uuid),
  public.renew_research_execution(uuid,uuid),public.release_research_execution(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_research_execution(uuid,uuid),
  public.renew_research_execution(uuid,uuid),public.release_research_execution(uuid,uuid) TO service_role;
