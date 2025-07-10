#!/usr/bin/env node

// Create test data to verify ranking functionality
// Run with: node tests/create-test-data.js

const { createClient } = require('@supabase/supabase-js')

// Use local Supabase for testing
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestData() {
  console.log('🏠 Creating test data for ranking verification...\n')

  const testUserId = 'test-user-' + Date.now()
  const collections = ['Test Collection A', 'Test Collection B']
  const rankingTypes = ['Main Ranking', 'Weekend Picks', 'Investment Potential']

  try {
    // Create test houses
    console.log('1. Creating test houses...')
    const houses = []
    
    for (let i = 0; i < 6; i++) {
      const collection = collections[i % 2]
      const house = {
        title: `Test House ${i + 1}`,
        description: `This is test house ${i + 1} in ${collection}`,
        collection_name: collection,
        user_id: testUserId,
        is_ranked: false
      }

      const { data, error } = await supabase
        .from('houses')
        .insert(house)
        .select()
        .single()

      if (error) throw error
      houses.push(data)
      console.log(`   ✅ Created: ${house.title}`)
    }

    // Create multiple rankings for the same houses
    console.log('\n2. Creating multiple rankings...')
    const rankings = []

    // For each collection
    for (const collection of collections) {
      const collectionHouses = houses.filter(h => h.collection_name === collection)
      
      // For each ranking type
      for (const rankingType of rankingTypes) {
        console.log(`   Creating ${rankingType} for ${collection}...`)
        
        // Rank houses in different orders for each ranking type
        for (let i = 0; i < collectionHouses.length; i++) {
          let rank
          if (rankingType === 'Main Ranking') {
            rank = i // 0, 1, 2
          } else if (rankingType === 'Weekend Picks') {
            rank = collectionHouses.length - 1 - i // 2, 1, 0 (reverse order)
          } else {
            rank = (i + 1) % collectionHouses.length // 1, 2, 0 (shifted)
          }

          const ranking = {
            house_id: collectionHouses[i].id,
            user_id: testUserId,
            collection_name: collection,
            ranking_name: rankingType,
            rank: rank
          }

          const { error } = await supabase
            .from('rankings')
            .insert(ranking)

          if (error) throw error
          rankings.push(ranking)
          console.log(`     ✅ Ranked "${collectionHouses[i].title}" as #${rank + 1} in ${rankingType}`)
        }

        // Mark houses as ranked
        await supabase
          .from('houses')
          .update({ is_ranked: true })
          .in('id', collectionHouses.map(h => h.id))
      }
    }

    console.log('\n3. Test data summary:')
    console.log(`   📦 Collections: ${collections.length}`)
    console.log(`   🏠 Houses: ${houses.length}`)
    console.log(`   📊 Rankings: ${rankings.length}`)
    console.log(`   👤 Test User ID: ${testUserId}`)

    console.log('\n4. Verification queries you can run:')
    console.log('\n   -- See all rankings for Test Collection A:')
    console.log(`   SELECT h.title, r.ranking_name, r.rank`)
    console.log(`   FROM houses h`)
    console.log(`   JOIN rankings r ON h.id = r.house_id`)
    console.log(`   WHERE h.collection_name = 'Test Collection A'`)
    console.log(`   ORDER BY r.ranking_name, r.rank;`)

    console.log('\n   -- Check multiple rankings for same house:')
    console.log(`   SELECT h.title, r.ranking_name, r.rank`)
    console.log(`   FROM houses h`)
    console.log(`   JOIN rankings r ON h.id = r.house_id`)
    console.log(`   WHERE h.title = 'Test House 1'`)
    console.log(`   ORDER BY r.ranking_name;`)

    console.log('\n5. Manual testing steps:')
    console.log('   a) Go to /manage page')
    console.log('   b) Switch between Test Collection A and B')
    console.log('   c) Go to /list page') 
    console.log('   d) Switch between ranking types for each collection')
    console.log('   e) Verify different house orders in different rankings')
    console.log('   f) Go to /rank page and try ranking a new house')

    console.log('\n✅ Test data created successfully!')
    console.log('\n🧪 You can now test the multiple rankings functionality in the UI')

    // Show sample data
    console.log('\n📋 Sample ranking data:')
    const { data: sampleData } = await supabase
      .from('rankings')
      .select(`
        rank,
        ranking_name,
        collection_name,
        houses!inner(title)
      `)
      .eq('user_id', testUserId)
      .order('collection_name')
      .order('ranking_name')
      .order('rank')

    sampleData?.forEach(item => {
      console.log(`   ${item.houses.title} | ${item.collection_name} | ${item.ranking_name} | Rank ${item.rank + 1}`)
    })

  } catch (error) {
    console.error('❌ Failed to create test data:', error.message)
    process.exit(1)
  }
}

// Cleanup function
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...')
  
  const testUserPattern = 'test-user-%'
  
  // Delete rankings first (due to foreign key constraints)
  const { error: rankingError } = await supabase
    .from('rankings')
    .delete()
    .like('user_id', testUserPattern)

  // Delete houses
  const { error: houseError } = await supabase
    .from('houses')
    .delete()
    .like('user_id', testUserPattern)

  if (rankingError || houseError) {
    console.error('❌ Error during cleanup:', rankingError || houseError)
  } else {
    console.log('✅ Test data cleaned up')
  }
}

// Command line options
const args = process.argv.slice(2)

if (args.includes('--cleanup')) {
  cleanupTestData()
} else {
  createTestData()
}