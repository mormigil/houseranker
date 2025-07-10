import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateApiKey } from '@/lib/auth'
import { calculateFinalRank, updateRanksAfterInsertion } from '@/lib/ranking'

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = request.headers.get('x-user-id') || 'default'
  const { houseId, comparisons, rankingName } = await request.json()

  if (!houseId || !comparisons) {
    return NextResponse.json({ error: 'House ID and comparisons are required' }, { status: 400 })
  }

  // Get the house being ranked to extract collection_name
  const { data: currentHouse, error: currentHouseError } = await supabase
    .from('houses')
    .select('collection_name')
    .eq('id', houseId)
    .eq('user_id', userId)
    .single()

  if (currentHouseError || !currentHouse) {
    return NextResponse.json({ error: 'House not found' }, { status: 404 })
  }

  // Query ranked houses with the same collection and ranking using the rankings table
  let rankedQuery = supabase
    .from('rankings')
    .select(`
      *,
      houses!inner(*)
    `)
    .eq('user_id', userId)
    .eq('collection_name', currentHouse.collection_name)
    .eq('ranking_name', rankingName || 'Main Ranking')

  const { data: rankedData, error: rankedError } = await rankedQuery.order('rank', { ascending: true })

  if (rankedError) {
    return NextResponse.json({ error: rankedError.message }, { status: 500 })
  }

  // Transform the data to match the expected format
  const rankedHouses = rankedData?.map(ranking => ({
    ...ranking.houses,
    rank: ranking.rank,
    ranking_name: ranking.ranking_name
  })) || []

  const finalRank = calculateFinalRank(rankedHouses, comparisons)
  
  const updatedHouses = updateRanksAfterInsertion(rankedHouses, finalRank)

  // Update existing rankings with new ranks using RPC for efficiency
  if (updatedHouses.length > 0) {
    const rankUpdates = updatedHouses.map(house => ({
      house_id: house.id,
      rank: house.rank
    }))

    const { error: updateError } = await supabase.rpc('update_ranking_ranks', {
      p_user_id: userId,
      p_collection_name: currentHouse.collection_name,
      p_ranking_name: rankingName || 'Main Ranking',
      rank_updates: rankUpdates
    })

    if (updateError) {
      console.error('Error updating rankings:', updateError)
    }
  }

  // Insert or update the ranking for the current house
  const { error: rankingUpsertError } = await supabase
    .from('rankings')
    .upsert({
      house_id: houseId,
      user_id: userId,
      collection_name: currentHouse.collection_name,
      ranking_name: rankingName || 'Main Ranking',
      rank: finalRank,
      updated_at: new Date().toISOString()
    })

  if (rankingUpsertError) {
    console.error('Error upserting ranking:', rankingUpsertError)
    return NextResponse.json({ error: rankingUpsertError.message }, { status: 500 })
  }

  // Update the house to mark it as ranked
  const { data: updatedHouse, error: houseError } = await supabase
    .from('houses')
    .update({
      is_ranked: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', houseId)
    .eq('user_id', userId)
    .select()
    .single()

  if (houseError) {
    return NextResponse.json({ error: houseError.message }, { status: 500 })
  }

  return NextResponse.json({
    house: updatedHouse,
    finalRank,
    message: 'House ranked successfully'
  })
}