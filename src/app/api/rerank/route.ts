import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateApiKey } from '@/lib/auth'

export async function DELETE(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = request.headers.get('x-user-id') || 'default'
  const { houseId, rankingName } = await request.json()

  if (!houseId) {
    return NextResponse.json({ error: 'House ID is required' }, { status: 400 })
  }

  // Get the house being unranked to extract collection_name
  const { data: currentHouse, error: currentHouseError } = await supabase
    .from('houses')
    .select('collection_name')
    .eq('id', houseId)
    .eq('user_id', userId)
    .single()

  if (currentHouseError || !currentHouse) {
    return NextResponse.json({ error: 'House not found' }, { status: 404 })
  }

  // Get the current ranking record to know what rank to remove
  const { data: currentRanking, error: rankingError } = await supabase
    .from('rankings')
    .select('rank')
    .eq('house_id', houseId)
    .eq('user_id', userId)
    .eq('collection_name', currentHouse.collection_name)
    .eq('ranking_name', rankingName || 'Main Ranking')
    .single()

  if (rankingError || !currentRanking) {
    return NextResponse.json({ error: 'Ranking not found' }, { status: 404 })
  }

  const removedRank = currentRanking.rank

  // Delete the ranking record
  const { error: deleteError } = await supabase
    .from('rankings')
    .delete()
    .eq('house_id', houseId)
    .eq('user_id', userId)
    .eq('collection_name', currentHouse.collection_name)
    .eq('ranking_name', rankingName || 'Main Ranking')

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Get all houses that were ranked higher than the removed house
  const { data: higherRankedHouses, error: fetchError } = await supabase
    .from('rankings')
    .select('id, rank')
    .eq('user_id', userId)
    .eq('collection_name', currentHouse.collection_name)
    .eq('ranking_name', rankingName || 'Main Ranking')
    .gt('rank', removedRank)

  if (fetchError) {
    console.error('Error fetching higher ranked houses:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch higher ranked houses' }, { status: 500 })
  }

  // Update ranks of houses that were ranked higher than the removed house
  // (decrease their rank by 1 to fill the gap)
  if (higherRankedHouses && higherRankedHouses.length > 0) {
    for (const house of higherRankedHouses) {
      const { error: updateError } = await supabase
        .from('rankings')
        .update({ 
          rank: house.rank - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', house.id)

      if (updateError) {
        console.error('Error updating rank for house:', house.id, updateError)
        return NextResponse.json({ error: 'Failed to update ranks' }, { status: 500 })
      }
    }
  }


  // Update the house to mark it as unranked
  const { data: updatedHouse, error: houseError } = await supabase
    .from('houses')
    .update({
      is_ranked: false,
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
    removedRank,
    message: 'House removed from ranking successfully'
  })
}