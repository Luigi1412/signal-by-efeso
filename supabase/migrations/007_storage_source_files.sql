-- Private bucket for original source captures.
-- Object path: <workspace_id>/<source_id>/<snapshot_id>/<original_filename>

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('source-files', 'source-files', false, 52428800)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit;

CREATE OR REPLACE FUNCTION public.storage_workspace_id_from_object_name(p_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  segment text;
BEGIN
  segment := split_part(p_name, '/', 1);
  IF segment ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN segment::uuid;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.storage_workspace_id_from_object_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_workspace_id_from_object_name(text) TO authenticated, anon;

DROP POLICY IF EXISTS source_files_select_member ON storage.objects;
DROP POLICY IF EXISTS source_files_insert_member ON storage.objects;
DROP POLICY IF EXISTS source_files_update_member ON storage.objects;
DROP POLICY IF EXISTS source_files_delete_member ON storage.objects;

CREATE POLICY source_files_select_member
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'source-files'
    AND public.is_active_workspace_member(public.storage_workspace_id_from_object_name(name))
  );

CREATE POLICY source_files_insert_member
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'source-files'
    AND public.is_active_workspace_member(public.storage_workspace_id_from_object_name(name))
  );

-- No public/anon policies. No DELETE policy for intelligence files.
-- UPDATE is not granted for rewriting historical captures.
