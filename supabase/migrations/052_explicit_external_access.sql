-- An administrator may approve ONE external address on its existing allowlist row.
-- No external domain is opened. Authentication, confirmation, activation and revocation remain mandatory.
ALTER TABLE public.workspace_authorized_emails
  ADD COLUMN external_access_approved boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.workspace_authorized_emails.external_access_approved IS
  'Explicit per-address domain exception; service-role administration only. Does not bypass status, confirmed Auth identity, membership or RLS.';

CREATE OR REPLACE FUNCTION public.is_active_workspace_member(p_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_pipeline_service_role() OR EXISTS (
    SELECT 1 FROM public.workspace_memberships m
    JOIN auth.users u ON u.id=m.user_id
    JOIN public.workspace_authorized_emails a ON a.workspace_id=m.workspace_id AND a.email=lower(u.email)
    JOIN public.workspaces w ON w.id=m.workspace_id
    WHERE m.workspace_id=p_workspace_id AND m.user_id=auth.uid() AND m.status='active'
      AND a.status='active' AND w.status='active' AND m.role=a.role
      AND a.activated_user_id=u.id AND u.email_confirmed_at IS NOT NULL
      AND (split_part(lower(u.email),'@',2)='efeso.com' OR a.external_access_approved)
  );
$$;
CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_pipeline_service_role() OR EXISTS (
    SELECT 1 FROM public.workspace_memberships m
    JOIN auth.users u ON u.id=m.user_id
    JOIN public.workspace_authorized_emails a ON a.workspace_id=m.workspace_id AND a.email=lower(u.email)
    JOIN public.workspaces w ON w.id=m.workspace_id
    WHERE m.workspace_id=p_workspace_id AND m.user_id=auth.uid() AND m.status='active'
      AND m.role='admin' AND a.role='admin' AND a.status='active' AND w.status='active'
      AND a.activated_user_id=u.id AND u.email_confirmed_at IS NOT NULL
      AND (split_part(lower(u.email),'@',2)='efeso.com' OR a.external_access_approved)
  );
$$;
CREATE OR REPLACE FUNCTION public.activate_allowlisted_member(p_user_id uuid,p_full_name text)
RETURNS SETOF public.workspace_memberships
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.workspace_authorized_emails%ROWTYPE; e text;
BEGIN
  IF NOT public.is_pipeline_service_role() THEN RAISE EXCEPTION 'service role required'; END IF;
  SELECT lower(email) INTO e FROM auth.users WHERE id=p_user_id AND email_confirmed_at IS NOT NULL;
  IF e IS NULL THEN RAISE EXCEPTION 'confirmed identity required'; END IF;
  SELECT x.* INTO a FROM public.workspace_authorized_emails x JOIN public.workspaces w ON w.id=x.workspace_id
    WHERE x.email=e AND w.slug='efeso-brazil' AND w.status='active' FOR UPDATE OF x;
  IF NOT FOUND OR a.status NOT IN ('invited','active') THEN RAISE EXCEPTION 'email not authorized'; END IF;
  IF split_part(e,'@',2)<>'efeso.com' AND NOT a.external_access_approved THEN
    RAISE EXCEPTION 'external address not approved';
  END IF;
  INSERT INTO public.profiles(id,full_name,job_title,preferred_locale)
    VALUES(p_user_id,coalesce(nullif(p_full_name,''),'SIGNAL Member'),CASE WHEN a.role='admin' THEN 'Administrador' ELSE 'Consultor' END,'pt-BR')
    ON CONFLICT(id) DO NOTHING;
  INSERT INTO public.workspace_memberships(workspace_id,user_id,role,status,provisioned_reason)
    VALUES(a.workspace_id,p_user_id,a.role,'active','email_allowlist')
    ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=EXCLUDED.role,status='active',provisioned_reason='email_allowlist';
  UPDATE public.workspace_authorized_emails SET status='active',activated_user_id=p_user_id,
    activated_at=coalesce(activated_at,now()) WHERE id=a.id;
  RETURN QUERY SELECT * FROM public.workspace_memberships WHERE workspace_id=a.workspace_id AND user_id=p_user_id;
END $$;
REVOKE ALL ON FUNCTION public.activate_allowlisted_member(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.activate_allowlisted_member(uuid,text) TO service_role;
