#!/bin/bash

# Invoice Transcript App - Development Startup Script

echo "🚀 Starting Invoice Transcript App..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Please create a .env file with your OPENAI_API_KEY"
    echo "Example: OPENAI_API_KEY=your_api_key_here"
fi

# Start backend server in background
echo "🔧 Starting backend server..."
npm run server &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend application..."
npm start

# Clean up background process on exit
trap "kill $BACKEND_PID" EXIT
