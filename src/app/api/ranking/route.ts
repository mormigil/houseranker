import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateApiKey } from '@/lib/auth'
import { calculateFinalRank, updateRanksAfterInsertion } from '@/lib/ranking'

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = request.headers.get('x-user-id') || 'default'
  const { houseId, comparisons } = await request.json()

  if (!houseId || !comparisons) {
    return NextResponse.json({ error: 'House ID and comparisons are required' }, { status: 400 })
  }

  const { data: rankedHouses, error: rankedError } = await supabase
    .from('houses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_ranked', true)
    .order('rank', { ascending: true })

  if (rankedError) {
    return NextResponse.json({ error: rankedError.message }, { status: 500 })
  }

  const finalRank = calculateFinalRank(rankedHouses, comparisons)
  
  const updatedHouses = updateRanksAfterInsertion(rankedHouses, finalRank)

  const { error: updateError } = await supabase.rpc('update_house_ranks', {
    house_updates: updatedHouses.map(house => ({
      id: house.id,
      rank: house.rank
    }))
  })

  if (updateError) {
    console.error('Error updating ranks:', updateError)
  }

  const { data: updatedHouse, error: houseError } = await supabase
    .from('houses')
    .update({
      rank: finalRank,
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