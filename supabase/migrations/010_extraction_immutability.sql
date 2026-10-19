-- SourceContentBlocks are historical parser output. Do not UPDATE/DELETE in product use.

CREATE OR REPLACE FUNCTION public.prevent_source_content_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'source_content_blocks are immutable'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER source_content_blocks_no_update
  BEFORE UPDATE ON public.source_content_blocks
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_source_content_block_mutation();

CREATE TRIGGER source_content_blocks_no_delete
  BEFORE DELETE ON public.source_content_blocks
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_source_content_block_mutation();
