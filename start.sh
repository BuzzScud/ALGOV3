#!/bin/bash
# Start script for Prime Tetration Trading Web App

echo "Starting Prime Tetration Trading Web App..."
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Kill any existing server on ports 8080, 8081
lsof -ti:8080,8081 | xargs kill -9 2>/dev/null || true

# Start the server
echo "Starting server on http://localhost:8080..."
echo "Open http://localhost:8080/index.html in your browser"
echo ""
node server.mjs

