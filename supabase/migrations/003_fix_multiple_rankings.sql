-- Create a separate rankings table to support multiple rankings per house
CREATE TABLE rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  ranking_name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_rankings_house_id ON rankings(house_id);
CREATE INDEX idx_rankings_user_collection_ranking ON rankings(user_id, collection_name, ranking_name);
CREATE INDEX idx_rankings_rank ON rankings(rank);

-- Create unique constraint to prevent duplicate rankings for same house in same ranking
CREATE UNIQUE INDEX idx_rankings_unique_house_ranking ON rankings(house_id, user_id, collection_name, ranking_name);

-- Migrate existing ranking data from houses table to rankings table
-- This is a one-time migration to preserve all existing rankings
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
  AND rank >= 0  -- Ensure valid rank values
ON CONFLICT (house_id, user_id, collection_name, ranking_name) DO NOTHING;

-- Log the migration results
DO $$
DECLARE
  migrated_count INTEGER;
  total_ranked_houses INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM rankings;
  SELECT COUNT(*) INTO total_ranked_houses FROM houses WHERE is_ranked = true AND rank IS NOT NULL;
  
  RAISE NOTICE 'Migration completed: % rankings migrated from % ranked houses', migrated_count, total_ranked_houses;
END $$;

-- Remove ranking-specific columns from houses table (but keep is_ranked for quick filtering)
-- Note: We'll keep ranking_name temporarily for backward compatibility during transition
ALTER TABLE houses DROP COLUMN IF EXISTS rank;

-- Verify migration integrity
DO $$
DECLARE
  orphaned_houses INTEGER;
BEGIN
  -- Check for ranked houses without corresponding rankings
  SELECT COUNT(*) INTO orphaned_houses
  FROM houses h
  WHERE h.is_ranked = true
    AND NOT EXISTS (
      SELECT 1 FROM rankings r 
      WHERE r.house_id = h.id AND r.user_id = h.user_id
    );
  
  IF orphaned_houses > 0 THEN
    RAISE WARNING 'Found % ranked houses without corresponding rankings - manual review needed', orphaned_houses;
  ELSE
    RAISE NOTICE 'Migration integrity check passed: all ranked houses have corresponding rankings';
  END IF;
END $$;