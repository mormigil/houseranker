import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateApiKey } from '@/lib/auth'

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get distinct collections from all users
    const { data: collectionsData, error: collectionsError } = await supabase
      .from('houses')
      .select('collection_name')
      .not('collection_name', 'is', null)
      .limit(1000)

    if (collectionsError) {
      console.error('Error fetching collections:', collectionsError)
      return NextResponse.json({ error: collectionsError.message }, { status: 500 })
    }

    // Get distinct ranking names from the rankings table
    const { data: rankingsData, error: rankingsError } = await supabase
      .from('rankings')
      .select('ranking_name')
      .limit(1000)

    if (rankingsError) {
      console.error('Error fetching rankings:', rankingsError)
      return NextResponse.json({ error: rankingsError.message }, { status: 500 })
    }

    // Extract unique collections and rankings
    const uniqueCollections = Array.from(new Set(
      collectionsData?.map(item => item.collection_name).filter(Boolean) || []
    )).sort()

    const uniqueRankings = Array.from(new Set(
      rankingsData?.map(item => item.ranking_name).filter(Boolean) || []
    )).sort()

    return NextResponse.json({
      collections: uniqueCollections,
      rankings: uniqueRankings
    })
  } catch (error) {
    console.error('Error in GET /api/collections:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch collections and rankings' 
    }, { status: 500 })
  }
}