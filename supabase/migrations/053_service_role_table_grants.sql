-- Hosted Supabase no longer applies the historical default table privileges
-- to service_role. Existing migrations grant authenticated explicitly and
-- keep anon revoked; the worker, provisioning and imports use service_role.
-- This does not add policies, does not grant anon, and does not bypass RLS.

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;

NOTIFY pgrst, 'reload schema';
