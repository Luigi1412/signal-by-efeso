-- SIGNAL V1 — email allowlist for first access.
-- Domain alone is insufficient: email must be pre-authorized (invited/active).

ALTER TABLE public.workspace_memberships
  DROP CONSTRAINT IF EXISTS workspace_memberships_provisioned_reason_check;

ALTER TABLE public.workspace_memberships
  ADD CONSTRAINT workspace_memberships_provisioned_reason_check
  CHECK (
    provisioned_reason IS NULL
    OR provisioned_reason IN ('corporate_domain', 'demo_seed', 'manual', 'email_allowlist')
  );

CREATE TABLE public.workspace_authorized_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'invited',
  invited_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  activated_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_authorized_emails_email_lower_check
    CHECK (email = lower(email)),
  CONSTRAINT workspace_authorized_emails_role_check
    CHECK (role IN ('member', 'consultant', 'manager', 'partner', 'admin')),
  CONSTRAINT workspace_authorized_emails_status_check
    CHECK (status IN ('invited', 'active', 'disabled')),
  CONSTRAINT workspace_authorized_emails_workspace_email_unique
    UNIQUE (workspace_id, email)
);

CREATE INDEX workspace_authorized_emails_email_idx
  ON public.workspace_authorized_emails (email);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.workspace_authorized_emails
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.workspace_authorized_emails ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.workspace_authorized_emails FROM anon, authenticated;

ALTER TABLE public.access_audit_events
  DROP CONSTRAINT IF EXISTS access_audit_events_type_check;

ALTER TABLE public.access_audit_events
  ADD CONSTRAINT access_audit_events_type_check CHECK (event_type IN (
    'invalid_domain',
    'membership_provisioned',
    'admin_route_denied',
    'authorization_failure',
    'email_not_authorized',
    'first_access_activated'
  ));

-- Seed allowlist rows for the EFESO Brazil workspace (idempotent).
INSERT INTO public.workspace_authorized_emails (workspace_id, email, role, status)
SELECT
  w.id,
  v.email,
  v.role,
  'invited'
FROM public.workspaces w
CROSS JOIN (
  VALUES
    ('demo.member@efeso.com'::text, 'member'::text),
    ('demo.admin@efeso.com'::text, 'admin'::text)
) AS v(email, role)
WHERE w.slug = 'efeso-brazil'
ON CONFLICT (workspace_id, email) DO NOTHING;
