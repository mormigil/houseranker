-- Create ranking_metadata table to store ranking names without requiring houses
CREATE TABLE ranking_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  ranking_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint and indexes
CREATE UNIQUE INDEX idx_ranking_metadata_unique ON ranking_metadata(user_id, collection_name, ranking_name);
CREATE INDEX idx_ranking_metadata_user_collection ON ranking_metadata(user_id, collection_name);