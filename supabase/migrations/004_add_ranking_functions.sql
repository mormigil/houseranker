-- Create function to update house rankings efficiently
CREATE OR REPLACE FUNCTION update_ranking_ranks(
  p_user_id TEXT,
  p_collection_name TEXT,
  p_ranking_name TEXT,
  rank_updates JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  update_record JSONB;
BEGIN
  FOR update_record IN SELECT * FROM jsonb_array_elements(rank_updates)
  LOOP
    UPDATE rankings 
    SET rank = (update_record->>'rank')::INTEGER,
        updated_at = NOW()
    WHERE house_id = (update_record->>'house_id')::UUID
      AND user_id = p_user_id
      AND collection_name = p_collection_name
      AND ranking_name = p_ranking_name;
  END LOOP;
END;
$$;