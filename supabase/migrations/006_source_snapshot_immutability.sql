-- SourceSnapshot is immutable. A new capture creates a new row.
-- Normal product UPDATE/DELETE must fail. Migrations/reset may recreate the table.

CREATE OR REPLACE FUNCTION public.prevent_source_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'source_snapshots are immutable'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER source_snapshots_no_update
  BEFORE UPDATE ON public.source_snapshots
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_source_snapshot_mutation();

CREATE TRIGGER source_snapshots_no_delete
  BEFORE DELETE ON public.source_snapshots
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_source_snapshot_mutation();
