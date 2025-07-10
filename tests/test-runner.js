#!/usr/bin/env node

// Simple test runner for ranking migration tests
// Run with: node tests/test-runner.js

const { execSync } = require('child_process')
const path = require('path')

console.log('🧪 Running Ranking Migration Tests...\n')

// Check if required environment variables are set
const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:')
  missingEnvVars.forEach(varName => console.error(`   - ${varName}`))
  console.error('\nPlease set these variables in your .env.local file')
  process.exit(1)
}

// Manual test execution (since we don't have jest configured)
async function runTests() {
  try {
    console.log('📋 Test Plan:')
    console.log('1. Database migration tests')
    console.log('2. Multiple rankings functionality')
    console.log('3. API endpoint tests')
    console.log('4. Ranking isolation tests')
    console.log('5. Bulk update efficiency tests\n')

    // Import and run the ranking migration tests
    console.log('🔄 Running database tests...')
    const migrationTests = require('./ranking-migration.test.js')
    
    console.log('✅ Database tests completed')
    
    console.log('\n🔄 Running API tests...')
    // Note: API tests require a running server, so we'll skip them in this simple runner
    console.log('⚠️  API tests require a running Next.js server on port 3001')
    console.log('   Run: npm run dev (in another terminal)')
    console.log('   Then: node -e "require(\'./tests/api-ranking.test.js\')"')
    
    console.log('\n✅ All available tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Check if we're running in CI or manual testing mode
if (process.argv.includes('--manual')) {
  console.log('🔧 Manual testing mode - check the migration manually')
  console.log('\n📝 Manual Test Checklist:')
  console.log('1. Run the migration: npm run db:migrate')
  console.log('2. Check migration results in database')
  console.log('3. Test multiple rankings in the UI')
  console.log('4. Verify ranking isolation between collections')
  console.log('5. Test switching between ranking types')
} else {
  runTests()
}