import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateApiKey } from '@/lib/auth'

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = request.headers.get('x-user-id') || 'default'
  const { collection_name, ranking_name } = await request.json()

  if (!collection_name || !ranking_name) {
    return NextResponse.json({ 
      error: 'Collection name and ranking name are required' 
    }, { status: 400 })
  }

  try {
    // For now, we'll create the ranking_metadata table on the fly if it doesn't exist
    // This is a simple approach that avoids the foreign key constraint
    
    // First, try to create the ranking_metadata table if it doesn't exist
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ranking_metadata (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id TEXT NOT NULL,
          collection_name TEXT NOT NULL,
          ranking_name TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, collection_name, ranking_name)
        );
        CREATE INDEX IF NOT EXISTS idx_ranking_metadata_user_collection ON ranking_metadata(user_id, collection_name);
      `
    })

    // Insert the ranking metadata
    const { data, error } = await supabase
      .from('ranking_metadata')
      .upsert({
        user_id: userId,
        collection_name: collection_name,
        ranking_name: ranking_name,
      })

    if (error) {
      console.error('Error creating ranking metadata:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Ranking created successfully',
      ranking_name: ranking_name 
    })
  } catch (error) {
    console.error('Error in POST /api/rankings:', error)
    return NextResponse.json({ 
      error: 'Failed to create ranking' 
    }, { status: 500 })
  }
}