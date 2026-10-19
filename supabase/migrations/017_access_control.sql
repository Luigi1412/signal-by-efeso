-- SIGNAL Sprint 4.5 — corporate access control support.
-- Domain authorization lives in the application. RLS remains membership-based.
-- Adds member role, access audit ledger, and no client writes to memberships.

ALTER TABLE public.workspace_memberships
  DROP CONSTRAINT workspace_memberships_role_check;

ALTER TABLE public.workspace_memberships
  ADD CONSTRAINT workspace_memberships_role_check
  CHECK (role IN ('member', 'consultant', 'manager', 'partner', 'admin'));

ALTER TABLE public.workspace_memberships
  ADD COLUMN IF NOT EXISTS provisioned_reason text;

ALTER TABLE public.workspace_memberships
  ADD CONSTRAINT workspace_memberships_provisioned_reason_check
  CHECK (
    provisioned_reason IS NULL
    OR provisioned_reason IN ('corporate_domain', 'demo_seed', 'manual')
  );

-- ---------------------------------------------------------------------------
-- access_audit_events — server-only ledger (no tokens, no passwords)
-- ---------------------------------------------------------------------------
CREATE TABLE public.access_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  outcome text NOT NULL,
  actor_user_id uuid,
  email_domain text,
  workspace_id uuid REFERENCES public.workspaces (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_audit_events_type_check CHECK (event_type IN (
    'invalid_domain',
    'membership_provisioned',
    'admin_route_denied',
    'authorization_failure'
  )),
  CONSTRAINT access_audit_events_outcome_check CHECK (outcome IN (
    'denied',
    'provisioned',
    'allowed'
  ))
);

CREATE INDEX access_audit_events_created_idx ON public.access_audit_events (created_at DESC);

ALTER TABLE public.access_audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.access_audit_events FROM anon, authenticated;
