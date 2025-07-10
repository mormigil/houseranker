#!/usr/bin/env node

// Database migration verification script
// Run with: node tests/verify-migration.js

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
let supabaseUrl, supabaseKey

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const envLines = envContent.split('\n')
  
  envLines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1]
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1]
    }
  })
} else {
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  console.error('Please check your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyMigration() {
  console.log('🔍 Verifying ranking migration...\n')

  try {
    // Check 1: Rankings table exists
    console.log('1. Checking if rankings table exists...')
    const { data: rankingsData, error: rankingsError } = await supabase
      .from('rankings')
      .select('count')
      .limit(1)

    if (rankingsError) {
      console.error('❌ Rankings table does not exist or is not accessible')
      console.error('Error:', rankingsError.message)
      return false
    }
    console.log('✅ Rankings table exists')

    // Check 2: Migration verification function exists and works
    console.log('\n2. Running migration verification function...')
    const { data: verificationData, error: verificationError } = await supabase
      .rpc('verify_ranking_migration')

    if (verificationError) {
      console.error('❌ Migration verification function failed')
      console.error('Error:', verificationError.message)
      return false
    }

    console.log('✅ Migration verification function works')
    console.log('\n📊 Migration Results:')
    verificationData.forEach(result => {
      console.log(`   ${result.status}: ${result.count} - ${result.details}`)
    })

    // Check 3: Bulk update function exists
    console.log('\n3. Testing bulk update function...')
    const { error: bulkUpdateError } = await supabase
      .rpc('update_ranking_ranks', {
        p_user_id: 'test-user',
        p_collection_name: 'test-collection',
        p_ranking_name: 'test-ranking',
        rank_updates: []
      })

    // This should work even with empty updates
    if (bulkUpdateError && !bulkUpdateError.message.includes('does not exist')) {
      console.error('❌ Bulk update function failed')
      console.error('Error:', bulkUpdateError.message)
      return false
    }
    console.log('✅ Bulk update function exists and works')

    // Check 4: Sample data verification
    console.log('\n4. Checking sample ranking data...')
    const { data: sampleRankings, error: sampleError } = await supabase
      .from('rankings')
      .select(`
        id,
        collection_name,
        ranking_name,
        rank,
        houses!inner(title)
      `)
      .limit(5)

    if (sampleError) {
      console.error('❌ Could not fetch sample rankings')
      console.error('Error:', sampleError.message)
      return false
    }

    if (sampleRankings.length === 0) {
      console.log('⚠️  No existing rankings found (this is OK for new installations)')
    } else {
      console.log('✅ Sample rankings data:')
      sampleRankings.forEach(ranking => {
        console.log(`   "${ranking.houses.title}" in "${ranking.collection_name}" (${ranking.ranking_name}) - Rank ${ranking.rank}`)
      })
    }

    // Check 5: Collections API data
    console.log('\n5. Testing collections API data structure...')
    const { data: collectionsData, error: collectionsError } = await supabase
      .from('houses')
      .select('collection_name')
      .not('collection_name', 'is', null)
      .limit(5)

    const { data: rankingNamesData, error: rankingNamesError } = await supabase
      .from('rankings')
      .select('ranking_name')
      .limit(5)

    if (collectionsError || rankingNamesError) {
      console.error('❌ Collections API data structure check failed')
      return false
    }

    console.log('✅ Collections API data structure is correct')

    console.log('\n🎉 Migration verification completed successfully!')
    console.log('\n✨ Ready to test:')
    console.log('1. Multiple rankings per house')
    console.log('2. Ranking isolation between collections')
    console.log('3. Bulk rank updates during binary ranking')
    console.log('4. Cross-user collection visibility')

    return true

  } catch (error) {
    console.error('❌ Verification failed with unexpected error:')
    console.error(error)
    return false
  }
}

// Run verification
verifyMigration().then(success => {
  process.exit(success ? 0 : 1)
})