# Docker Setup Guide for LearnSynth

This guide will help you set up and run LearnSynth using Docker and Docker Compose.

## 📋 Prerequisites

- [Docker](https://www.docker.com/get-started) installed on your system
- [Docker Compose](https://docs.docker.com/compose/install/) (usually comes with Docker Desktop)
- At least 4GB of available RAM
- At least 10GB of available disk space

## 🚀 Quick Start

### 1. Configure Environment Variables

First, copy the example environment file:
```bash
cp .env.example .env
```

Edit the `.env` file with your credentials:
```bash
# Supabase Configuration (Required)
# Get these from https://app.supabase.io/project/[your-project]/settings/api
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# OpenAI API Key (Required for AI features)
OPENAI_API_KEY=your_openai_api_key_here
```

**Where to find Supabase credentials:**
1. Go to [app.supabase.io](https://app.supabase.io)
2. Select your LearnSynth project
3. Click **Settings** → **API**
4. Copy the **URL** and both **anon** and **service_role** keys

### 2. Start All Services

Run the following command from the project root:
```bash
docker-compose up
```

This will start:
- **Backend API** (port 4000) - connects to your Supabase cloud database
- **Frontend React App** (port 5173)

**Note**: No local database needed! Your data is stored in Supabase's cloud PostgreSQL database.

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **Supabase Dashboard**: https://app.supabase.io (manage your database here)

## 🔧 Docker Commands

### Start Services in Background
```bash
docker-compose up -d
```

### Stop All Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f
```

### Rebuild Containers (after code changes)
```bash
docker-compose up --build
```

### Remove All Containers
```bash
docker-compose down
```

### Clean Up Docker System
```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune
```

## 📁 Directory Structure

When running with Docker, the following directories are mounted as volumes:

```
learnsynth/
├── backend/
│   └── uploads/          # Uploaded documents (persistent)
└── frontend/             # Frontend source code
```

**Note**: This project uses **Supabase** (managed PostgreSQL in the cloud) for the database, so there's no local database to manage. Your data is stored securely in Supabase's cloud infrastructure.

## 🗄️ Database Management (Supabase)

Since you're using Supabase, you manage your database through the Supabase dashboard:

### Access Supabase Dashboard
- Go to [app.supabase.io](https://app.supabase.io)
- Select your project
- Use the SQL Editor for queries
- Check the Table Editor for data management

### Backup Database
- Supabase automatically backs up your data
- You can also export data from the dashboard
- For automated backups, use Supabase's built-in backup features

### Restore Database
- Import SQL files through the Supabase dashboard
- Use the SQL Editor to run restoration scripts

### Supabase CLI (Optional)
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Pull database schema
supabase db pull

# Push schema changes
supabase db push
```

## 🔍 Troubleshooting

### Port Already in Use

If you get errors about ports being in use:
```bash
# Check what's using port 4000
netstat -tulpn | grep :4000

# Check what's using port 5173
netstat -tulpn | grep :5173

# Kill processes on those ports (Windows)
taskkill /PID <PID> /F

# Kill processes on those ports (Mac/Linux)
kill -9 <PID>
```

Or stop Docker containers:
```bash
docker-compose down
```

### Container Won't Start

1. Check logs:
```bash
docker-compose logs <service-name>
```

2. Common issues:
   - **Port conflicts**: Ensure ports 4000, 5173, 5432, 6379 are available
   - **Insufficient memory**: Close other applications
   - **Permission issues**: Run Docker as administrator/root

### Changes Not Reflecting

1. Rebuild containers:
```bash
docker-compose up --build
```

2. If that doesn't work, restart completely:
```bash
docker-compose down
docker system prune -f
docker-compose up
```

### Database Connection Issues

1. Ensure PostgreSQL container is running:
```bash
docker-compose ps
```

2. Check database logs:
```bash
docker-compose logs postgres
```

3. Wait for database to be ready (may take 10-20 seconds on first start)

## 🛠️ Development Tips

### Hot Reload

Both backend and frontend support hot reload:
- **Backend**: Changes to `.ts` files will reload the server
- **Frontend**: Changes to React components will reload the page

Just make changes to your code and they'll be reflected automatically!

### Viewing Container Shell

Access a running container's shell:
```bash
# Backend container
docker-compose exec backend sh

# Frontend container
docker-compose exec frontend sh

# Database container
docker-compose exec postgres sh
```

### Monitor Resource Usage

```bash
# View running containers
docker stats
```

## 📝 Environment Variables

Complete list of environment variables you can configure in `.env`:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| SUPABASE_URL | Your Supabase project URL | https://xyz123.supabase.co |
| SUPABASE_ANON_KEY | Supabase anonymous key | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |
| OPENAI_API_KEY | OpenAI API key for AI features | sk-... |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development |
| PORT | Backend port | 4000 |
| FRONTEND_URL | Frontend URL for CORS | http://localhost:5173 |
| REDIS_URL | Redis connection string | redis://redis:6379 |
| LLM_PROVIDER | AI provider | openai |
| TTS_PROVIDER | Text-to-speech provider | stub |
| EMBEDDING_PROVIDER | Embeddings provider | stub |
| VITE_API_URL | Frontend API URL | http://localhost:4000 |
| VITE_WS_URL | Frontend WebSocket URL | http://localhost:4000 |

**Where to get Supabase credentials:**
1. Go to [app.supabase.io](https://app.supabase.io)
2. Select your project
3. Go to Settings → API
4. Copy the URL and keys from there

## 🚦 Production Deployment

For production deployment, you'll want to:

1. **Change default passwords** in `.env`
2. **Use environment-specific configurations**
3. **Set up SSL certificates**
4. **Configure proper logging**
5. **Set up database backups**
6. **Use a production-grade database**
7. **Configure a reverse proxy** (nginx)

Example production docker-compose.yml modifications:
```yaml
services:
  backend:
    environment:
      NODE_ENV: production
    # Add production-specific configs
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    # Use production build
```

## 💡 Pro Tips

1. **Use Docker Desktop Dashboard**: If you have Docker Desktop installed, you can manage containers through the GUI
2. **Keep Docker Updated**: Regularly update Docker to get latest features and security patches
3. **Monitor Disk Space**: Docker volumes can consume significant disk space
4. **Version Control**: Commit `.env.example` but NOT `.env` to Git

## 🆘 Getting Help

If you encounter issues:

1. Check the logs: `docker-compose logs`
2. Verify all ports are available
3. Ensure Docker has sufficient resources
4. Check the [troubleshooting section](#-troubleshooting) above
5. Restart Docker Desktop if needed

## 🎯 Next Steps

After getting Docker running:

1. Upload your first document
2. Create a knowledge base
3. Test the AI-enhanced lesson generation
4. Try the AI tutor chat feature
5. Complete a chapter quiz

Enjoy your learning journey with LearnSynth! 🎓✨
