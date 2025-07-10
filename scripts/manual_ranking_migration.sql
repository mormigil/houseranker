-- Manual Ranking Migration Script
-- Use this if you want to run the migration step-by-step or if the automatic migration failed

-- STEP 1: Create backup (ALWAYS run this first!)
SELECT create_houses_backup();

-- STEP 2: Check current state before migration
SELECT 
  'Current ranked houses' as description,
  COUNT(*) as count
FROM houses 
WHERE is_ranked = true AND rank IS NOT NULL;

SELECT 
  'Collections with ranked houses' as description,
  COUNT(DISTINCT collection_name) as count
FROM houses 
WHERE is_ranked = true AND rank IS NOT NULL;

SELECT 
  'Ranking names in use' as description,
  ranking_name,
  COUNT(*) as house_count
FROM houses 
WHERE is_ranked = true AND rank IS NOT NULL
GROUP BY ranking_name
ORDER BY house_count DESC;

-- STEP 3: Create rankings table (if not already created)
CREATE TABLE IF NOT EXISTS rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  ranking_name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 4: Create indexes (if not already created)
CREATE INDEX IF NOT EXISTS idx_rankings_house_id ON rankings(house_id);
CREATE INDEX IF NOT EXISTS idx_rankings_user_collection_ranking ON rankings(user_id, collection_name, ranking_name);
CREATE INDEX IF NOT EXISTS idx_rankings_rank ON rankings(rank);

-- STEP 5: Create unique constraint (if not already created)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_rankings_unique_house_ranking'
  ) THEN
    CREATE UNIQUE INDEX idx_rankings_unique_house_ranking ON rankings(house_id, user_id, collection_name, ranking_name);
  END IF;
END $$;

-- STEP 6: Perform the migration (safe with conflict handling)
INSERT INTO rankings (house_id, user_id, collection_name, ranking_name, rank, created_at, updated_at)
SELECT 
  id as house_id,
  user_id,
  COALESCE(collection_name, 'Default Collection') as collection_name,
  COALESCE(ranking_name, 'Main Ranking') as ranking_name,
  rank,
  COALESCE(created_at, NOW()) as created_at,
  COALESCE(updated_at, NOW()) as updated_at
FROM houses 
WHERE is_ranked = true 
  AND rank IS NOT NULL
  AND rank >= 0
ON CONFLICT (house_id, user_id, collection_name, ranking_name) DO NOTHING;

-- STEP 7: Verify migration results
SELECT * FROM verify_ranking_migration();

-- STEP 8: Check for any issues
WITH migration_check AS (
  SELECT 
    h.id,
    h.user_id,
    h.collection_name,
    h.ranking_name as house_ranking_name,
    h.rank as house_rank,
    h.is_ranked,
    r.ranking_name as rankings_ranking_name,
    r.rank as rankings_rank
  FROM houses h
  LEFT JOIN rankings r ON h.id = r.house_id AND h.user_id = r.user_id
  WHERE h.is_ranked = true
)
SELECT 
  'Houses with ranking mismatches' as issue_type,
  COUNT(*) as count
FROM migration_check
WHERE house_rank IS NOT NULL 
  AND (rankings_rank IS NULL OR house_rank != rankings_rank);

-- STEP 9: Sample of migrated data
SELECT 
  h.title,
  h.collection_name,
  r.ranking_name,
  r.rank
FROM houses h
JOIN rankings r ON h.id = r.house_id
ORDER BY h.collection_name, r.ranking_name, r.rank
LIMIT 10;

-- STEP 10: Drop rank column (ONLY run this after verifying everything looks good!)
-- ALTER TABLE houses DROP COLUMN IF EXISTS rank;

-- If something went wrong, rollback with:
-- SELECT rollback_ranking_migration('houses_backup_YYYY_MM_DD_HH24_MI_SS');