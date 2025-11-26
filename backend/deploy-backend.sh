#!/bin/bash
# Backend Deployment Script
# This script deploys the backend files to /var/www/voynich-backend
# Run this script from the backend/ directory or provide the path to backend files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_SOURCE_DIR="$SCRIPT_DIR"
BACKEND_TARGET_DIR="/var/www/voynich-backend"

echo -e "${BLUE}=== Backend Deployment Script ===${NC}"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}Warning: Running as root. Will use current user for file ownership.${NC}"
    ACTUAL_USER="${SUDO_USER:-$USER}"
else
    ACTUAL_USER="$USER"
fi

echo -e "${YELLOW}Source directory: ${BACKEND_SOURCE_DIR}${NC}"
echo -e "${YELLOW}Target directory: ${BACKEND_TARGET_DIR}${NC}"
echo -e "${YELLOW}File owner: ${ACTUAL_USER}${NC}"
echo ""

# Step 1: Create target directory
echo -e "${YELLOW}Step 1: Creating target directory...${NC}"
sudo mkdir -p "$BACKEND_TARGET_DIR"
sudo chown -R "$ACTUAL_USER:$ACTUAL_USER" "$BACKEND_TARGET_DIR"
echo -e "${GREEN}✓ Directory created${NC}"

# Step 2: Copy backend files
echo ""
echo -e "${YELLOW}Step 2: Copying backend files...${NC}"

# Check if source files exist
if [ ! -f "$BACKEND_SOURCE_DIR/server.mjs" ]; then
    echo -e "${RED}Error: server.mjs not found in $BACKEND_SOURCE_DIR${NC}"
    exit 1
fi

if [ ! -f "$BACKEND_SOURCE_DIR/package.json" ]; then
    echo -e "${RED}Error: package.json not found in $BACKEND_SOURCE_DIR${NC}"
    exit 1
fi

# Copy essential files
echo "Copying server.mjs..."
cp "$BACKEND_SOURCE_DIR/server.mjs" "$BACKEND_TARGET_DIR/"

echo "Copying package.json..."
cp "$BACKEND_SOURCE_DIR/package.json" "$BACKEND_TARGET_DIR/"

if [ -f "$BACKEND_SOURCE_DIR/package-lock.json" ]; then
    echo "Copying package-lock.json..."
    cp "$BACKEND_SOURCE_DIR/package-lock.json" "$BACKEND_TARGET_DIR/"
fi

if [ -f "$BACKEND_SOURCE_DIR/ecosystem.config.cjs" ]; then
    echo "Copying ecosystem.config.cjs..."
    cp "$BACKEND_SOURCE_DIR/ecosystem.config.cjs" "$BACKEND_TARGET_DIR/"
elif [ -f "$BACKEND_SOURCE_DIR/ecosystem.config.js" ]; then
    echo "Copying ecosystem.config.js (will be renamed to .cjs)..."
    cp "$BACKEND_SOURCE_DIR/ecosystem.config.js" "$BACKEND_TARGET_DIR/ecosystem.config.cjs"
fi

# Set ownership
sudo chown -R "$ACTUAL_USER:$ACTUAL_USER" "$BACKEND_TARGET_DIR"
echo -e "${GREEN}✓ Files copied${NC}"

# Step 3: Install dependencies
echo ""
echo -e "${YELLOW}Step 3: Installing dependencies (this may take a minute)...${NC}"
cd "$BACKEND_TARGET_DIR"

# Ensure we have write permissions
sudo chown -R "$ACTUAL_USER:$ACTUAL_USER" "$BACKEND_TARGET_DIR"
sudo chown -R "$ACTUAL_USER:$ACTUAL_USER" "$BACKEND_TARGET_DIR/node_modules" 2>/dev/null || true

# Install dependencies
npm install

# Verify undici is installed
if npm list undici > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Dependencies installed (including undici)${NC}"
else
    echo -e "${YELLOW}Installing undici...${NC}"
    npm install undici
    echo -e "${GREEN}✓ undici installed${NC}"
fi

# Step 4: Create PM2 config if it doesn't exist
echo ""
echo -e "${YELLOW}Step 4: Setting up PM2 configuration...${NC}"
if [ ! -f "$BACKEND_TARGET_DIR/ecosystem.config.cjs" ]; then
    cat > "$BACKEND_TARGET_DIR/ecosystem.config.cjs" << 'EOF'
module.exports = {
  apps: [{
    name: 'voynich-backend',
    script: 'server.mjs',
    cwd: '/var/www/voynich-backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: '/var/log/pm2/voynich-backend-error.log',
    out_file: '/var/log/pm2/voynich-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
    sudo chown "$ACTUAL_USER:$ACTUAL_USER" "$BACKEND_TARGET_DIR/ecosystem.config.cjs"
    echo -e "${GREEN}✓ PM2 config created${NC}"
else
    echo -e "${GREEN}✓ PM2 config already exists${NC}"
fi

# Step 5: Create log directory
echo ""
echo -e "${YELLOW}Step 5: Setting up log directory...${NC}"
sudo mkdir -p /var/log/pm2
sudo chown -R "$ACTUAL_USER:$ACTUAL_USER" /var/log/pm2
echo -e "${GREEN}✓ Log directory ready${NC}"

# Step 6: Start/restart PM2 process
echo ""
echo -e "${YELLOW}Step 6: Starting backend with PM2...${NC}"

# Delete existing process if it exists
pm2 delete voynich-backend 2>/dev/null || true

# Start the process
pm2 start "$BACKEND_TARGET_DIR/ecosystem.config.cjs"

# Save PM2 configuration
pm2 save

echo -e "${GREEN}✓ PM2 process started${NC}"

# Step 7: Verify deployment
echo ""
echo -e "${YELLOW}Step 7: Verifying deployment...${NC}"

# Wait a moment for server to start
sleep 3

# Check PM2 status
echo ""
echo "PM2 Status:"
pm2 status | grep voynich-backend || echo -e "${RED}Process not found!${NC}"

# Check logs for fetch initialization
echo ""
echo "Checking fetch initialization in logs:"
if pm2 logs voynich-backend --lines 30 --nostream 2>/dev/null | grep -i "fetch\|undici" | head -3; then
    echo -e "${GREEN}✓ Fetch appears to be initialized${NC}"
else
    echo -e "${YELLOW}⚠ Could not find fetch initialization in logs${NC}"
    echo "View full logs with: pm2 logs voynich-backend"
fi

# Test API endpoint
echo ""
echo "Testing API endpoint:"
if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is responding${NC}"
    curl -s http://localhost:8080/api/health | head -3
else
    echo -e "${RED}✗ Backend is not responding${NC}"
    echo "Check logs with: pm2 logs voynich-backend --lines 50"
fi

echo ""
echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo ""
echo "Backend files deployed to: $BACKEND_TARGET_DIR"
echo ""
echo "Useful commands:"
echo "  - View logs: pm2 logs voynich-backend"
echo "  - Restart: pm2 restart voynich-backend"
echo "  - Status: pm2 status"
echo "  - Stop: pm2 stop voynich-backend"
echo ""

