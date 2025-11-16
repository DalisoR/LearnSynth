#!/bin/bash

# LearnSynth Docker Quick Start Script
# This script helps you quickly start LearnSynth with Docker

echo "🚀 LearnSynth Docker Quick Start"
echo "================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env file and add your OpenAI API key:"
    echo "   OPENAI_API_KEY=your_openai_api_key_here"
    echo ""
    echo "Press ENTER when you've updated the .env file..."
    read
fi

# Build and start services
echo "🔨 Building and starting services..."
echo "This may take a few minutes on the first run..."
echo ""

docker-compose up --build

echo ""
echo "✅ Services started!"
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:4000"
echo "🗄️  Database: localhost:5432 (postgres/postgres)"
echo ""
echo "Press Ctrl+C to stop all services"
