import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateApiKey } from '@/lib/auth'

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ranked = searchParams.get('ranked')
  const collectionName = searchParams.get('collection_name')
  const rankingName = searchParams.get('ranking_name')
  const userId = request.headers.get('x-user-id') || 'default'

  if (ranked === 'true') {
    // For ranked houses, query the rankings table and join with houses
    let query = supabase
      .from('rankings')
      .select(`
        rank,
        ranking_name,
        houses!inner(*)
      `)
      .eq('user_id', userId)

    if (collectionName) {
      query = query.eq('collection_name', collectionName)
    }

    if (rankingName) {
      query = query.eq('ranking_name', rankingName)
    }

    const { data, error } = await query
      .order('rank', { ascending: true })
      .limit(1000)

    if (error) {
      console.error('Supabase error in GET /api/houses (ranked):', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Flatten the data to match expected house format
    const flattenedData = data?.map(ranking => ({
      ...ranking.houses,
      rank: ranking.rank,
      ranking_name: ranking.ranking_name
    }))

    return NextResponse.json(flattenedData)
  } else {
    // For unranked houses or general queries, use the houses table directly
    let query = supabase
      .from('houses')
      .select('*')
      .eq('user_id', userId)

    if (collectionName) {
      query = query.eq('collection_name', collectionName)
    }

    if (ranked === 'false') {
      query = query.eq('is_ranked', false).order('created_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query.limit(1000)

    if (error) {
      console.error('Supabase error in GET /api/houses:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }
}

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = request.headers.get('x-user-id') || 'default'
  const { title, description, image_url, listing_url, collection_name } = await request.json()

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('houses')
    .insert([
      {
        title,
        description,
        image_url,
        listing_url,
        collection_name: collection_name || 'Default Collection',
        user_id: userId,
        is_ranked: false,
      },
    ])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}