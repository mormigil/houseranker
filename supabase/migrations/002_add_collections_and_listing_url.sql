-- Add new columns to houses table
ALTER TABLE houses ADD COLUMN listing_url TEXT;
ALTER TABLE houses ADD COLUMN collection_name TEXT DEFAULT 'Default Collection';
ALTER TABLE houses ADD COLUMN ranking_name TEXT DEFAULT 'Main Ranking';

-- Create indexes for better performance
CREATE INDEX idx_houses_collection_name ON houses(collection_name);
CREATE INDEX idx_houses_ranking_name ON houses(ranking_name);

-- Update existing houses to have default values
UPDATE houses 
SET collection_name = 'Default Collection'
WHERE collection_name IS NULL;

UPDATE houses 
SET ranking_name = 'Main Ranking'
WHERE is_ranked = true AND ranking_name IS NULL;