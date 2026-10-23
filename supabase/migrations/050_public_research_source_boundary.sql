CREATE FUNCTION public.member_can_read_research_source(p_source uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.sources s WHERE s.id=p_source
    AND public.is_active_workspace_member(s.workspace_id)
    AND (public.is_workspace_admin(s.workspace_id) OR (s.access_type='public' AND s.source_type<>'internal_efeso')));
$$;
CREATE FUNCTION public.member_can_read_research_snapshot(p_snapshot uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.source_snapshots s WHERE s.id=p_snapshot AND public.member_can_read_research_source(s.source_id));
$$;
REVOKE ALL ON FUNCTION public.member_can_read_research_source(uuid),public.member_can_read_research_snapshot(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.member_can_read_research_source(uuid),public.member_can_read_research_snapshot(uuid) TO authenticated,service_role;
CREATE POLICY public_research_source_boundary ON public.sources AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_research_source(id));
CREATE POLICY public_research_snapshot_boundary ON public.source_snapshots AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_research_source(source_id));
CREATE POLICY public_research_blocks_boundary ON public.source_content_blocks AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_research_snapshot(source_snapshot_id));
CREATE POLICY public_research_fragments_boundary ON public.evidence_fragments AS RESTRICTIVE FOR SELECT TO authenticated USING(public.member_can_read_research_snapshot(source_snapshot_id));
CREATE POLICY public_research_storage_boundary ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING(
  CASE WHEN split_part(name,'/',2) ~ '^[0-9a-f-]{36}$'
    THEN public.member_can_read_research_source(split_part(name,'/',2)::uuid) ELSE false END);
