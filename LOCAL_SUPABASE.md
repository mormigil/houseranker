# Local Supabase Setup (Optional)

If you want to run everything completely local without cloud dependencies:

## Prerequisites
- Docker installed
- Supabase CLI

## Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Start local Supabase
supabase start
```

This will:
- Start PostgreSQL locally
- Give you local URLs and keys
- Run at http://localhost:54323

## Configure Local Environment

Update `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54323
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
APP_API_KEY=local-dev-key-123
```

## Apply Schema

```bash
# Copy our schema to Supabase migrations
cp supabase-schema.sql supabase/migrations/001_initial_schema.sql

# Apply migrations
supabase db reset
```

## Benefits
- Completely offline development
- Faster development (no network latency)
- Full control over database

## Drawbacks
- More complex setup
- Need Docker running
- Separate deployment setup needed