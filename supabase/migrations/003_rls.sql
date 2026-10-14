-- Row Level Security. Tenant boundary is the workspace.
-- Active members may access data in workspaces where they have status = 'active'.
-- Membership writes for demo bootstrap use the service-role (bypasses RLS).

-- ---------------------------------------------------------------------------
-- Helper: is the current auth.uid() an active member of this workspace?
-- SECURITY DEFINER + fixed search_path avoids RLS recursion on workspace_memberships.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_memberships m
      WHERE m.workspace_id = p_workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    );
$$;

REVOKE ALL ON FUNCTION public.is_active_workspace_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_workspace_member(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_runs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Grants: authenticated can read/write where policies allow. No DELETE.
-- anon has no table access.
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.workspaces FROM anon, authenticated;
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.workspace_memberships FROM anon, authenticated;
REVOKE ALL ON TABLE public.companies FROM anon, authenticated;
REVOKE ALL ON TABLE public.company_entities FROM anon, authenticated;
REVOKE ALL ON TABLE public.analyses FROM anon, authenticated;
REVOKE ALL ON TABLE public.research_runs FROM anon, authenticated;

GRANT SELECT ON TABLE public.workspaces TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.workspace_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.company_entities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.analyses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.research_runs TO authenticated;

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------
CREATE POLICY workspaces_select_member
  ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (public.is_active_workspace_member(id));

-- ---------------------------------------------------------------------------
-- profiles — own row only
-- ---------------------------------------------------------------------------
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- workspace_memberships — members may read their workspace; no self-admin insert
-- ---------------------------------------------------------------------------
CREATE POLICY workspace_memberships_select_member
  ON public.workspace_memberships
  FOR SELECT
  TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
CREATE POLICY companies_select_member
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY companies_insert_member
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_workspace_member(workspace_id));

CREATE POLICY companies_update_member
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (public.is_active_workspace_member(workspace_id))
  WITH CHECK (public.is_active_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- company_entities — access via owning company's workspace
-- ---------------------------------------------------------------------------
CREATE POLICY company_entities_select_member
  ON public.company_entities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = company_entities.company_id
        AND public.is_active_workspace_member(c.workspace_id)
    )
  );

CREATE POLICY company_entities_insert_member
  ON public.company_entities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = company_entities.company_id
        AND public.is_active_workspace_member(c.workspace_id)
    )
  );

CREATE POLICY company_entities_update_member
  ON public.company_entities
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = company_entities.company_id
        AND public.is_active_workspace_member(c.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = company_entities.company_id
        AND public.is_active_workspace_member(c.workspace_id)
    )
  );

-- ---------------------------------------------------------------------------
-- analyses
-- INSERT: created_by_user_id must be the authenticated user.
-- workspace_id must be a workspace the user belongs to (and matches company via FK).
-- ---------------------------------------------------------------------------
CREATE POLICY analyses_select_member
  ON public.analyses
  FOR SELECT
  TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY analyses_insert_member
  ON public.analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_workspace_member(workspace_id)
    AND created_by_user_id = auth.uid()
  );

CREATE POLICY analyses_update_member
  ON public.analyses
  FOR UPDATE
  TO authenticated
  USING (public.is_active_workspace_member(workspace_id))
  WITH CHECK (public.is_active_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- research_runs
-- INSERT: requested_by_user_id must be the authenticated user.
-- ---------------------------------------------------------------------------
CREATE POLICY research_runs_select_member
  ON public.research_runs
  FOR SELECT
  TO authenticated
  USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY research_runs_insert_member
  ON public.research_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_workspace_member(workspace_id)
    AND requested_by_user_id = auth.uid()
  );

CREATE POLICY research_runs_update_member
  ON public.research_runs
  FOR UPDATE
  TO authenticated
  USING (public.is_active_workspace_member(workspace_id))
  WITH CHECK (public.is_active_workspace_member(workspace_id));
