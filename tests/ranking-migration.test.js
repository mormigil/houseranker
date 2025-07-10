// Test suite for ranking migration and multiple rankings functionality
// Run with: npm test tests/ranking-migration.test.js

const { supabase } = require('../src/lib/supabase')

describe('Ranking Migration Tests', () => {
  const testUserId = 'test-user-' + Date.now()
  const testCollection = 'Test Collection'
  let testHouseIds = []

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData()
    
    // Create test houses
    const houses = [
      { title: 'House A', description: 'Test house A', collection_name: testCollection },
      { title: 'House B', description: 'Test house B', collection_name: testCollection },
      { title: 'House C', description: 'Test house C', collection_name: testCollection },
      { title: 'House D', description: 'Test house D', collection_name: testCollection }
    ]

    for (const house of houses) {
      const { data, error } = await supabase
        .from('houses')
        .insert({ ...house, user_id: testUserId })
        .select()
        .single()
      
      if (error) throw error
      testHouseIds.push(data.id)
    }
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  async function cleanupTestData() {
    // Clean up rankings
    await supabase
      .from('rankings')
      .delete()
      .eq('user_id', testUserId)

    // Clean up houses
    await supabase
      .from('houses')
      .delete()
      .eq('user_id', testUserId)
  }

  test('should support multiple rankings for the same house', async () => {
    const houseId = testHouseIds[0]
    
    // Create two different rankings for the same house
    const rankings = [
      {
        house_id: houseId,
        user_id: testUserId,
        collection_name: testCollection,
        ranking_name: 'Main Ranking',
        rank: 1
      },
      {
        house_id: houseId,
        user_id: testUserId,
        collection_name: testCollection,
        ranking_name: 'Weekend Picks',
        rank: 3
      }
    ]

    const { error } = await supabase
      .from('rankings')
      .insert(rankings)

    expect(error).toBeNull()

    // Verify both rankings exist
    const { data: mainRanking } = await supabase
      .from('rankings')
      .select('*')
      .eq('house_id', houseId)
      .eq('ranking_name', 'Main Ranking')
      .single()

    const { data: weekendRanking } = await supabase
      .from('rankings')
      .select('*')
      .eq('house_id', houseId)
      .eq('ranking_name', 'Weekend Picks')
      .single()

    expect(mainRanking.rank).toBe(1)
    expect(weekendRanking.rank).toBe(3)
  })

  test('should prevent duplicate rankings for same house in same ranking', async () => {
    const houseId = testHouseIds[1]
    
    // Insert first ranking
    const { error: firstError } = await supabase
      .from('rankings')
      .insert({
        house_id: houseId,
        user_id: testUserId,
        collection_name: testCollection,
        ranking_name: 'Main Ranking',
        rank: 2
      })

    expect(firstError).toBeNull()

    // Try to insert duplicate ranking (should fail)
    const { error: duplicateError } = await supabase
      .from('rankings')
      .insert({
        house_id: houseId,
        user_id: testUserId,
        collection_name: testCollection,
        ranking_name: 'Main Ranking',
        rank: 5
      })

    expect(duplicateError).not.toBeNull()
    expect(duplicateError.code).toBe('23505') // Unique constraint violation
  })

  test('should update existing ranking when upserting', async () => {
    const houseId = testHouseIds[2]
    
    // Initial ranking
    await supabase
      .from('rankings')
      .insert({
        house_id: houseId,
        user_id: testUserId,
        collection_name: testCollection,
        ranking_name: 'Main Ranking',
        rank: 4
      })

    // Upsert with new rank
    const { error } = await supabase
      .from('rankings')
      .upsert({
        house_id: houseId,
        user_id: testUserId,
        collection_name: testCollection,
        ranking_name: 'Main Ranking',
        rank: 1
      })

    expect(error).toBeNull()

    // Verify the rank was updated
    const { data } = await supabase
      .from('rankings')
      .select('rank')
      .eq('house_id', houseId)
      .eq('ranking_name', 'Main Ranking')
      .single()

    expect(data.rank).toBe(1)
  })

  test('should fetch houses with correct ranking data via API query', async () => {
    // Create rankings for multiple houses in same ranking
    const rankings = [
      { house_id: testHouseIds[0], rank: 1, ranking_name: 'Test Ranking' },
      { house_id: testHouseIds[1], rank: 2, ranking_name: 'Test Ranking' },
      { house_id: testHouseIds[2], rank: 3, ranking_name: 'Test Ranking' }
    ].map(r => ({
      ...r,
      user_id: testUserId,
      collection_name: testCollection
    }))

    await supabase.from('rankings').insert(rankings)

    // Mark houses as ranked
    await supabase
      .from('houses')
      .update({ is_ranked: true })
      .in('id', testHouseIds.slice(0, 3))

    // Query ranked houses with ranking info (simulating API call)
    const { data, error } = await supabase
      .from('houses')
      .select(`
        *,
        rankings!inner(rank, ranking_name)
      `)
      .eq('user_id', testUserId)
      .eq('is_ranked', true)
      .eq('collection_name', testCollection)
      .eq('rankings.ranking_name', 'Test Ranking')
      .order('rankings.rank', { ascending: true })

    expect(error).toBeNull()
    expect(data).toHaveLength(3)
    expect(data[0].rankings[0].rank).toBe(1)
    expect(data[1].rankings[0].rank).toBe(2)
    expect(data[2].rankings[0].rank).toBe(3)
  })

  test('should handle bulk rank updates efficiently', async () => {
    // Create initial rankings
    const rankings = [
      { house_id: testHouseIds[0], rank: 1 },
      { house_id: testHouseIds[1], rank: 2 },
      { house_id: testHouseIds[2], rank: 3 }
    ].map(r => ({
      ...r,
      user_id: testUserId,
      collection_name: testCollection,
      ranking_name: 'Bulk Test Ranking'
    }))

    await supabase.from('rankings').insert(rankings)

    // Simulate inserting a new house at rank 2 (shifting others down)
    const rankUpdates = [
      { house_id: testHouseIds[1], rank: 3 }, // House B: 2 → 3
      { house_id: testHouseIds[2], rank: 4 }  // House C: 3 → 4
    ]

    // Test the bulk update function
    const { error } = await supabase.rpc('update_ranking_ranks', {
      p_user_id: testUserId,
      p_collection_name: testCollection,
      p_ranking_name: 'Bulk Test Ranking',
      rank_updates: rankUpdates
    })

    expect(error).toBeNull()

    // Verify ranks were updated correctly
    const { data } = await supabase
      .from('rankings')
      .select('house_id, rank')
      .eq('user_id', testUserId)
      .eq('ranking_name', 'Bulk Test Ranking')
      .order('rank')

    expect(data[0].rank).toBe(1) // House A unchanged
    expect(data[1].rank).toBe(3) // House B shifted
    expect(data[2].rank).toBe(4) // House C shifted
  })

  test('should isolate rankings by collection and ranking name', async () => {
    const houseId = testHouseIds[0]
    
    // Create rankings in different collections and ranking names
    const rankings = [
      {
        house_id: houseId,
        user_id: testUserId,
        collection_name: 'Collection A',
        ranking_name: 'Main Ranking',
        rank: 1
      },
      {
        house_id: houseId,
        user_id: testUserId,
        collection_name: 'Collection B',
        ranking_name: 'Main Ranking',
        rank: 5
      },
      {
        house_id: houseId,
        user_id: testUserId,
        collection_name: 'Collection A',
        ranking_name: 'Weekend Ranking',
        rank: 3
      }
    ]

    const { error } = await supabase.from('rankings').insert(rankings)
    expect(error).toBeNull()

    // Verify each ranking is isolated
    const collectionAMain = await supabase
      .from('rankings')
      .select('rank')
      .eq('house_id', houseId)
      .eq('collection_name', 'Collection A')
      .eq('ranking_name', 'Main Ranking')
      .single()

    const collectionBMain = await supabase
      .from('rankings')
      .select('rank')
      .eq('house_id', houseId)
      .eq('collection_name', 'Collection B')
      .eq('ranking_name', 'Main Ranking')
      .single()

    const collectionAWeekend = await supabase
      .from('rankings')
      .select('rank')
      .eq('house_id', houseId)
      .eq('collection_name', 'Collection A')
      .eq('ranking_name', 'Weekend Ranking')
      .single()

    expect(collectionAMain.data.rank).toBe(1)
    expect(collectionBMain.data.rank).toBe(5)
    expect(collectionAWeekend.data.rank).toBe(3)
  })
})