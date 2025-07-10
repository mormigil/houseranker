-- Migration verification and rollback functions
-- Run this after the main migration to verify everything worked correctly

-- Function to verify migration integrity
CREATE OR REPLACE FUNCTION verify_ranking_migration()
RETURNS TABLE (
  status TEXT,
  details TEXT,
  count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check 1: All ranked houses have corresponding rankings
  RETURN QUERY
  SELECT 
    'ranked_houses_with_rankings' as status,
    'Houses marked as ranked that have entries in rankings table' as details,
    COUNT(*)::INTEGER as count
  FROM houses h
  WHERE h.is_ranked = true
    AND EXISTS (
      SELECT 1 FROM rankings r 
      WHERE r.house_id = h.id AND r.user_id = h.user_id
    );

  -- Check 2: Orphaned ranked houses (ranked but no ranking entry)
  RETURN QUERY
  SELECT 
    'orphaned_ranked_houses' as status,
    'Houses marked as ranked but missing from rankings table' as details,
    COUNT(*)::INTEGER as count
  FROM houses h
  WHERE h.is_ranked = true
    AND NOT EXISTS (
      SELECT 1 FROM rankings r 
      WHERE r.house_id = h.id AND r.user_id = h.user_id
    );

  -- Check 3: Total rankings created
  RETURN QUERY
  SELECT 
    'total_rankings' as status,
    'Total number of rankings in the new table' as details,
    COUNT(*)::INTEGER as count
  FROM rankings;

  -- Check 4: Unique houses in rankings
  RETURN QUERY
  SELECT 
    'unique_houses_in_rankings' as status,
    'Number of unique houses that have rankings' as details,
    COUNT(DISTINCT house_id)::INTEGER as count
  FROM rankings;

  -- Check 5: Collections with rankings
  RETURN QUERY
  SELECT 
    'collections_with_rankings' as status,
    'Number of collections that have rankings' as details,
    COUNT(DISTINCT collection_name)::INTEGER as count
  FROM rankings;

  -- Check 6: Ranking names
  RETURN QUERY
  SELECT 
    'distinct_ranking_names' as status,
    'Number of distinct ranking names' as details,
    COUNT(DISTINCT ranking_name)::INTEGER as count
  FROM rankings;
END;
$$;

-- Function to create a backup of current houses table before migration
CREATE OR REPLACE FUNCTION create_houses_backup()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  backup_table_name TEXT;
  record_count INTEGER;
BEGIN
  backup_table_name := 'houses_backup_' || to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS');
  
  EXECUTE format('CREATE TABLE %I AS SELECT * FROM houses', backup_table_name);
  
  EXECUTE format('SELECT COUNT(*) FROM %I', backup_table_name) INTO record_count;
  
  RETURN format('Backup created: %s with %s records', backup_table_name, record_count);
END;
$$;

-- Function to rollback migration (emergency use only)
CREATE OR REPLACE FUNCTION rollback_ranking_migration(backup_table_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  result_message TEXT;
BEGIN
  -- Verify backup table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = backup_table_name
  ) THEN
    RETURN 'ERROR: Backup table ' || backup_table_name || ' does not exist';
  END IF;

  -- Restore rank column if it was dropped
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'houses' AND column_name = 'rank'
  ) THEN
    ALTER TABLE houses ADD COLUMN rank INTEGER;
  END IF;

  -- Restore ranking data from backup
  EXECUTE format('
    UPDATE houses 
    SET rank = backup.rank,
        ranking_name = backup.ranking_name
    FROM %I backup
    WHERE houses.id = backup.id
      AND backup.rank IS NOT NULL',
    backup_table_name
  );

  -- Drop rankings table
  DROP TABLE IF EXISTS rankings CASCADE;

  result_message := 'Migration rolled back successfully using ' || backup_table_name;
  
  RETURN result_message;
END;
$$;

-- Run verification
SELECT * FROM verify_ranking_migration();

-- Example usage (commented out for safety):
-- To create backup before migration: SELECT create_houses_backup();
-- To rollback: SELECT rollback_ranking_migration('houses_backup_2025_01_10_12_34_56');