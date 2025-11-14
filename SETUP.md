# LearnSynth Setup Guide

This guide will walk you through setting up LearnSynth locally and in production.

## Table of Contents

- [Local Development Setup](#local-development-setup)
- [Supabase Configuration](#supabase-configuration)
- [Provider API Keys](#provider-api-keys)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites

Install the following on your system:

1. **Node.js 18+ and npm 9+**
   ```bash
   # Check versions
   node --version  # Should be 18+
   npm --version   # Should be 9+
   ```

2. **Git**
   ```bash
   git --version
   ```

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-username/learnsynth.git
cd learnsynth

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Environment Configuration

**Backend Environment:**
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your configuration:
```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Supabase (Required - see Supabase section below)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional - stub works without these
LLM_PROVIDER=stub
TTS_PROVIDER=stub
VECTOR_DB_MODE=stub
```

**Frontend Environment:**
```bash
cd ../frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:4000
```

### Step 3: Start Development Servers

**Option 1: Start both servers**
```bash
# From root directory
npm run dev:all
```

**Option 2: Start individually**
```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Backend runs on http://localhost:4000

# Terminal 2 - Frontend
cd frontend
npm run dev
# Frontend runs on http://localhost:5173
```

### Step 4: Verify Installation

1. Open http://localhost:5173
2. You should see the LearnSynth dashboard
3. Check backend health: http://localhost:4000/api/health

---

## Supabase Configuration

Supabase is used for database, authentication, and file storage.

### Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"

### Step 2: Create New Project

1. Choose your organization
2. Fill in project details:
   - **Name**: `learnsynth-dev` (or your preference)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to you
3. Click "Create new project"
4. Wait 2-3 minutes for setup to complete

### Step 3: Get API Keys

1. Go to **Settings > API**
2. Copy the following:
   - **Project URL** → This is `SUPABASE_URL`
   - **anon/public key** → This is `SUPABASE_ANON_KEY`
   - **service_role key** → This is `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Keep this secret!

### Step 4: Setup Database Schema

1. Go to **SQL Editor**
2. Click "New Query"
3. Copy the contents of `backend/src/database/schema.sql`
4. Paste into the editor
5. Click "Run"
6. You should see "Success. No rows returned"

This creates:
- Tables: users, documents, chapters, lessons, subjects, embeddings, etc.
- Indexes for performance
- Row Level Security (RLS) policies

### Step 5: Create Storage Bucket

1. Go to **Storage**
2. Click "Create a new bucket"
3. Name: `documents`
4. Make it public: **Yes** (needed for file access)
5. Click "Create bucket"

### Step 6: Configure Authentication (Optional)

1. Go to **Authentication > Settings**
2. Under "Site URL", add: `http://localhost:5173`
3. Under "Additional Redirect URLs", add: `http://localhost:5173/**`
4. Save changes

---

## Provider API Keys

LearnSynth works fully with stub providers, but you can enable real AI services:

### OpenAI (LLM) - Optional

**Purpose**: Generate actual lessons and chat responses

**Setup**:
1. Go to https://platform.openai.com
2. Create account
3. Go to **API Keys**
4. Click "Create new secret key"
5. Copy the key
6. Add to `backend/.env`:
   ```env
   LLM_PROVIDER=openai
   OPENAI_API_KEY=sk-your-key-here
   ```

**Cost**: Pay-per-use, ~$0.002 per 1K tokens

### ElevenLabs (TTS) - Optional

**Purpose**: Generate realistic speech for lesson narration

**Setup**:
1. Go to https://elevenlabs.io
2. Create account
3. Go to **Profile Settings**
4. Copy API key
5. Add to `backend/.env`:
   ```env
   TTS_PROVIDER=elevenlabs
   ELEVENLABS_API_KEY=your-api-key
   ```

**Cost**: 10,000 characters/month free, then $0.18/1K characters

### Google Gemini (LLM Alternative) - Optional

**Purpose**: Alternative to OpenAI for LLM

**Setup**:
1. Go to https://ai.google.dev
2. Create account
3. Create API key
4. Add to `backend/.env`:
   ```env
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=your-api-key
   ```

**Cost**: Free tier available

---

## Production Deployment

### Backend Deployment (Railway Example)

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Deploy**
   ```bash
   cd backend
   railway login
   railway link
   railway up
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set SUPABASE_URL=your_production_url
   railway variables set SUPABASE_ANON_KEY=your_anon_key
   railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_key
   railway variables set NODE_ENV=production
   railway variables set FRONTEND_URL=https://yourdomain.com
   ```

4. **Set Build Command**
   ```bash
   railway variables set BUILD_COMMAND=npm run build
   railway variables set START_COMMAND=npm start
   ```

### Backend Deployment (Render Example)

1. Go to https://render.com
2. Connect your GitHub repo
3. Create new "Web Service"
4. Configure:
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`
   - **Environment**: Node
5. Set environment variables in dashboard
6. Deploy

### Frontend Deployment (Vercel)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   cd frontend
   vercel
   ```

3. **Set Environment Variables**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   vercel env add VITE_API_URL
   ```

4. **Production Deploy**
   ```bash
   vercel --prod
   ```

### Frontend Deployment (Netlify)

1. Go to https://netlify.com
2. Connect GitHub repo
3. Configure:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Set environment variables in dashboard
5. Deploy

---

## Production Checklist

Before going live:

- [ ] Set `NODE_ENV=production`
- [ ] Use production Supabase URL/keys
- [ ] Set correct `FRONTEND_URL` (your domain)
- [ ] Update CORS settings in backend
- [ ] Update API URLs in frontend
- [ ] Enable HTTPS
- [ ] Set up domain name
- [ ] Test all features
- [ ] Monitor logs for errors
- [ ] Set up error tracking (Sentry, etc.)

---

## Troubleshooting

### Backend won't start

**Error**: Port 4000 already in use
```bash
# Find and kill process
lsof -ti:4000 | xargs kill -9

# Or use different port
PORT=4001 npm run dev
```

**Error**: Supabase connection failed
- Check SUPABASE_URL and keys are correct
- Verify Supabase project is active
- Check network connectivity

### Frontend won't start

**Error**: Vite failed to fetch
- Check VITE_API_URL points to backend
- Ensure backend is running
- Check CORS settings

**Error**: Module not found
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Database errors

**Error**: Relation does not exist
- Run database schema: `backend/src/database/schema.sql`
- Check you're using the correct Supabase project

**Error**: Permission denied
- Verify SUPABASE_SERVICE_ROLE_KEY is correct
- Check RLS policies in Supabase

### Test suite fails

```bash
# Backend tests
cd backend
npm test

# Integration tests
npm run test:integration
```

### Build fails

**Backend:**
```bash
cd backend
npm run build
# Check for TypeScript errors
```

**Frontend:**
```bash
cd frontend
npm run build
# Check for missing dependencies
```

---

## Getting Help

- Check error logs in terminal
- Check browser console (F12)
- Check backend logs at `/api/health`
- Open GitHub issue with:
  - Error message
  - Steps to reproduce
  - Environment details (OS, Node version)
  - Log output

---

## Next Steps

After setup:

1. Upload your first textbook (PDF/DOCX)
2. Generate lessons
3. Try the chat feature
4. Create a knowledge base
5. Set up spaced repetition
6. Create a study group
7. Invite collaborators

Enjoy learning with LearnSynth! 🎓
