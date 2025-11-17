# Supabase Setup Guide

## The Issue
You're getting a 400 Bad Request error when trying to sign in. This means the Supabase configuration is incorrect.

## Quick Fix Options

### Option 1: Use Your Own Supabase Project (Recommended)

1. **Create a Supabase account** at https://supabase.com
2. **Create a new project** with a database password
3. **Get your credentials:**
   - Go to Project Settings → API
   - Copy your Project URL
   - Copy your anon/public key
4. **Update frontend/.env** with your credentials:
   ```
   VITE_SUPABASE_URL=your_project_url_here
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   VITE_API_URL=http://localhost:4000/api
   ```
5. **Enable Authentication:**
   - Go to Authentication → Settings
   - Make sure "Enable email confirmations" is unchecked for development
   - Add your site URL (http://localhost:5173) to Site URL settings

### Option 2: Use Mock Authentication (Development Only)

If you want to test the UI without Supabase, we can enable mock mode:

1. Create a `.env.local` file in the frontend directory with:
   ```
   VITE_USE_MOCK_AUTH=true
   ```

2. I'll modify the AuthContext to use mock authentication

### Option 3: Local Supabase (Advanced)

For a local setup:
1. Install Supabase CLI
2. Run `supabase init`
3. Run `supabase start`
4. Update your .env with local credentials

## Current Error Details

The error `POST https://kztsnltlelcpecgofmtp.supabase.co/auth/v1/token?grant_type=password 400` means:
- The project URL might not exist
- The API key might be wrong
- Authentication might be disabled
- The project might be paused

## Recommended Next Steps

I recommend **Option 1** - creating your own free Supabase project. It's free for small projects and takes just a few minutes.

After updating the .env file, restart the frontend server:
```bash
cd frontend
npm run dev
```
