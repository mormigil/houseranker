-- Create the houses table
CREATE TABLE houses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  rank INTEGER,
  is_ranked BOOLEAN DEFAULT FALSE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_houses_user_id ON houses(user_id);
CREATE INDEX idx_houses_rank ON houses(rank) WHERE rank IS NOT NULL;
CREATE INDEX idx_houses_is_ranked ON houses(is_ranked);

-- Create a function to update ranks efficiently
CREATE OR REPLACE FUNCTION update_house_ranks(house_updates JSONB[])
RETURNS VOID AS $$
DECLARE
    house_update JSONB;
BEGIN
    FOREACH house_update IN ARRAY house_updates
    LOOP
        UPDATE houses 
        SET rank = (house_update->>'rank')::INTEGER,
            updated_at = NOW()
        WHERE id = (house_update->>'id')::UUID;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (optional - for multi-user support)
CREATE POLICY "Users can view their own houses" ON houses
    FOR SELECT USING (auth.uid()::TEXT = user_id OR user_id = 'default');

CREATE POLICY "Users can insert their own houses" ON houses
    FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id OR user_id = 'default');

CREATE POLICY "Users can update their own houses" ON houses
    FOR UPDATE USING (auth.uid()::TEXT = user_id OR user_id = 'default');

CREATE POLICY "Users can delete their own houses" ON houses
    FOR DELETE USING (auth.uid()::TEXT = user_id OR user_id = 'default');