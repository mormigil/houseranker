# Development Setup Guide

This guide will help you set up the house ranker app for local development.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier is fine)
- Git

## 1. Local Development Setup

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be created (usually takes 2-3 minutes)
3. Go to Settings → API in your Supabase dashboard
4. Copy your Project URL and anon/public key

### Step 3: Set up Database Schema

1. In your Supabase dashboard, go to the SQL Editor
2. Copy the contents of `supabase-schema.sql` from this project
3. Paste it into the SQL Editor and run it
4. This will create the `houses` table and necessary functions

### Step 4: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   APP_API_KEY=your-secure-api-key-here
   ```

   For `APP_API_KEY`, you can use any secure string like `my-secret-key-123` for local development.

### Step 5: Start Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Step 6: Set Your API Key in the App

1. Open the app in your browser
2. You'll see an API key input on the home page
3. Enter the same value you put in `APP_API_KEY` in your `.env.local`
4. Click Save - this stores it in your browser's localStorage

## 2. Using the App Locally

1. **Add Houses**: Go to "Manage Houses" and add some test houses
2. **Start Ranking**: Go to "Rank Houses" and compare houses
3. **View Results**: Go to "View Rankings" to see your ranked list

## 3. Development Workflow

### Making Changes

```bash
# The dev server will auto-reload when you make changes
npm run dev

# Run type checking
npm run build

# Run linting
npm run lint
```

### Testing API Endpoints

You can test the API endpoints directly:

```bash
# Get all houses
curl -H "x-api-key: your-api-key" http://localhost:3000/api/houses

# Add a house
curl -X POST -H "Content-Type: application/json" -H "x-api-key: your-api-key" \
  -d '{"title":"Test House","description":"A test house"}' \
  http://localhost:3000/api/houses
```

## 4. Database Management

### Viewing Data

In your Supabase dashboard:
1. Go to Table Editor
2. Select the `houses` table
3. View/edit your data

### Resetting Data

To clear all houses and start fresh:
1. Go to SQL Editor in Supabase
2. Run: `DELETE FROM houses WHERE user_id = 'default';`

## 5. Troubleshooting

### Common Issues

**"API key not found"**: Make sure your API key in the app matches `APP_API_KEY` in `.env.local`

**"Failed to fetch houses"**: Check your Supabase URL and keys in `.env.local`

**Build errors**: Run `npm run build` to check for TypeScript/linting issues

**Database connection issues**: Verify your Supabase project is active and the schema was created correctly

### Environment Variables

If you need to change environment variables:
1. Update `.env.local`
2. Restart the development server (`npm run dev`)
3. Clear your browser cache if needed

## 6. Ready for Production?

Once your local development is working well:

1. **Test thoroughly locally**
2. **Commit your changes** (but don't commit `.env.local`)
3. **Deploy to Vercel** (see deployment guide)

## File Structure

```
src/
├── app/                 # Next.js app router pages
│   ├── api/            # API endpoints
│   ├── list/           # Rankings view page
│   ├── rank/           # Ranking comparison page
│   ├── manage/         # House management page
│   └── page.tsx        # Home page
├── components/         # React components
├── lib/               # Utilities and configurations
└── types/             # TypeScript type definitions
```

Happy coding! 🏠