@echo off
REM LearnSynth Docker Quick Start Script for Windows
REM This script helps you quickly start LearnSynth with Docker

echo.
echo 🚀 LearnSynth Docker Quick Start
echo =================================
echo.

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker is not installed. Please install Docker first:
    echo    https://docs.docker.com/get-docker/
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
where docker-compose >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Desktop which includes Compose.
    pause
    exit /b 1
)

echo ✅ Docker is installed
echo.

REM Check if .env exists
if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env >nul
    echo.
    echo ⚠️  IMPORTANT: Please edit .env file and add your OpenAI API key:
    echo    OPENAI_API_KEY=your_openai_api_key_here
    echo.
    echo After updating .env, run this script again.
    pause
    exit /b 0
)

REM Build and start services
echo 🔨 Building and starting services...
echo This may take a few minutes on the first run...
echo.

docker-compose up --build

echo.
echo ✅ Services started!
echo 📱 Frontend: http://localhost:5173
echo 🔧 Backend: http://localhost:4000
echo 🗄️  Database: localhost:5432 (postgres/postgres)
echo.
echo Press Ctrl+C to stop all services
pause
