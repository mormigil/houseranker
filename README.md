# House Ranker

A Beli-style ranking app for houses that uses binary search comparison to efficiently rank properties during your house hunting process.

## Features

- **Binary Search Ranking**: Efficiently rank houses by comparing them pairwise using binary search
- **Scrollable Rankings**: View your houses ranked from best to worst
- **House Management**: Add new houses with titles, descriptions, and images
- **API Key Authentication**: Secure access using personal API keys
- **Dark Mode Support**: Beautiful UI that works in light and dark modes
- **Responsive Design**: Works great on mobile and desktop

## Getting Started

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd houseranker
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your project URL and anon key
3. Run the SQL from `supabase-schema.sql` in your Supabase SQL editor
4. Update `.env.local` with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
APP_API_KEY=your_secure_api_key
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### 4. Set Your API Key

When you first visit the app, you'll be prompted to enter your API key. This should match the `APP_API_KEY` in your environment variables.

## How It Works

### Binary Search Ranking

The app uses a binary search algorithm to efficiently find the correct position for new houses in your ranking:

1. **Add Houses**: Start by adding unranked houses with titles, descriptions, and images
2. **Start Ranking**: The app will show you comparisons between your new house and existing ranked houses
3. **Make Comparisons**: Choose which house you prefer in each comparison
4. **Automatic Placement**: The app uses binary search to find the optimal position with minimal comparisons

### Pages

- **Home**: Dashboard with API key management and navigation
- **View Rankings**: See all your houses ranked from best to worst
- **Rank Houses**: Compare and rank unranked houses
- **Manage Houses**: Add new houses and manage existing ones

## Database Schema

The app uses a single `houses` table with the following fields:

- `id`: Unique identifier
- `title`: House title/name
- `description`: Optional description
- `image_url`: Optional image URL
- `rank`: Position in ranking (0-based)
- `is_ranked`: Whether the house has been ranked
- `user_id`: User identifier for multi-user support
- `created_at`, `updated_at`: Timestamps

## API Endpoints

- `GET /api/houses` - Get all houses
- `GET /api/houses?ranked=true` - Get ranked houses only
- `GET /api/houses?ranked=false` - Get unranked houses only
- `POST /api/houses` - Add a new house
- `PUT /api/houses/[id]` - Update a house
- `DELETE /api/houses/[id]` - Delete a house
- `POST /api/ranking` - Submit ranking comparisons

## Deployment

### Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

### Environment Variables

Make sure to set these in your deployment environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
APP_API_KEY=your_secure_api_key
```

## Mobile Usage

The app is designed to work great on mobile devices. Simply:

1. Visit the deployed URL on your phone
2. Enter your API key (stored locally in browser)
3. Start ranking houses on the go!

## Contributing

Feel free to submit issues and enhancement requests!
