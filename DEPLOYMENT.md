# Deployment Guide

This guide covers how to deploy your house ranker app to Vercel after local development.

## Local Development → Vercel Workflow

### 1. Local Development Setup

First, get everything working locally:

```bash
# 1. Set up your local environment (see DEVELOPMENT.md)
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 2. Start development
npm run dev
# App runs at http://localhost:3000

# 3. Test thoroughly
# - Add houses
# - Rank them 
# - Verify everything works
```

### 2. Prepare for Deployment

Before deploying, make sure everything is ready:

```bash
# Test that the build works
npm run test-build

# Check for any linting issues
npm run lint

# Make sure all changes are committed
git add .
git commit -m "Ready for deployment"
```

### 3. Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Push to GitHub**:
   ```bash
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with GitHub
   - Click "New Project"
   - Import your `houseranker` repository

3. **Configure Environment Variables**:
   In the Vercel deployment settings, add these environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   APP_API_KEY=your-production-api-key
   ```
   
   **Important**: Use a different, secure API key for production!

4. **Deploy**:
   - Click "Deploy"
   - Vercel will build and deploy your app
   - You'll get a URL like `https://houseranker-xxx.vercel.app`

#### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Link to existing project or create new one
# - Set environment variables when prompted
```

### 4. Post-Deployment Setup

1. **Test the deployed app**:
   - Visit your Vercel URL
   - Enter your production API key
   - Test all functionality

2. **Set up custom domain** (optional):
   - In Vercel dashboard, go to your project
   - Go to Settings → Domains
   - Add your custom domain

### 5. Ongoing Development Workflow

```bash
# 1. Develop locally
npm run dev
# Make changes, test locally

# 2. Commit changes
git add .
git commit -m "Add new feature"

# 3. Push to GitHub
git push origin main

# 4. Auto-deploy
# Vercel automatically deploys when you push to main branch
```

## Environment Variables Reference

### Local Development (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
APP_API_KEY=local-dev-key-123  # Simple key for local dev
```

### Production (Vercel)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
APP_API_KEY=super-secure-production-key-456  # Strong key for production
```

## Mobile Access

Once deployed:

1. **Visit the Vercel URL on your phone**
2. **Enter your production API key** (same as set in Vercel env vars)
3. **Add to home screen** for app-like experience:
   - iOS: Safari → Share → Add to Home Screen
   - Android: Chrome → Menu → Add to Home Screen

## Troubleshooting Deployment

### Build Fails
```bash
# Test locally first
npm run test-build

# Common issues:
# - TypeScript errors
# - Missing environment variables
# - Import/export issues
```

### Environment Variable Issues
- Make sure all env vars are set in Vercel dashboard
- Variable names must match exactly
- Restart deployment after changing env vars

### Database Connection Issues
- Verify Supabase URL and key are correct
- Check Supabase project is active
- Ensure database schema is properly set up

### API Authentication Issues
- Make sure APP_API_KEY in Vercel matches what you enter in the app
- Try clearing browser cache
- Check browser dev tools for error messages

## Security Notes

- **Never commit** `.env.local` to git (it's in `.gitignore`)
- **Use strong API keys** for production
- **Consider separate Supabase projects** for dev/production if needed
- **API keys are stored locally** in browser localStorage

## Performance Tips

- The app is optimized for mobile use
- Images are automatically optimized by Next.js
- Database queries are indexed for performance
- Consider adding image compression for user uploads

Happy deploying! 🚀