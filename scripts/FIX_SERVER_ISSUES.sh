#!/bin/bash
# Fix Server Issues - Complete Setup Script
# This script fixes: git repository, permissions, npm install, and PM2 setup

set -e

echo "=== Fixing Server Issues ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Fix permissions on backend directory
echo -e "${YELLOW}Step 1: Fixing permissions...${NC}"
if [ -d "/var/www/voynich-backend" ]; then
    echo "Setting ownership of /var/www/voynich-backend to current user..."
    sudo chown -R $USER:$USER /var/www/voynich-backend
    echo -e "${GREEN}✓ Permissions fixed${NC}"
else
    echo "Creating /var/www/voynich-backend directory..."
    sudo mkdir -p /var/www/voynich-backend
    sudo chown -R $USER:$USER /var/www/voynich-backend
    echo -e "${GREEN}✓ Directory created${NC}"
fi

# Step 2: Set up git repository
echo ""
echo -e "${YELLOW}Step 2: Setting up git repository...${NC}"
cd /var/www/voynich-backend

if [ -d ".git" ]; then
    echo "Git repository already exists, pulling latest..."
    git pull origin main || {
        echo "Git pull failed, resetting to origin/main..."
        git fetch origin main
        git reset --hard origin/main
    }
    echo -e "${GREEN}✓ Git repository updated${NC}"
else
    echo "Initializing git repository..."
    # Check if directory is empty or has files
    if [ "$(ls -A)" ]; then
        echo "Directory has files, initializing git and adding remote..."
        git init
        git remote add origin https://github.com/BuzzScud/ALGOV3.git || git remote set-url origin https://github.com/BuzzScud/ALGOV3.git
        git fetch origin main
        git reset --hard origin/main
    else
        echo "Directory is empty, cloning repository..."
        cd /var/www
        sudo rm -rf voynich-backend
        git clone https://github.com/BuzzScud/ALGOV3.git voynich-backend
        sudo chown -R $USER:$USER voynich-backend
        cd voynich-backend
    fi
    echo -e "${GREEN}✓ Git repository set up${NC}"
fi

# Step 3: Install dependencies
echo ""
echo -e "${YELLOW}Step 3: Installing dependencies...${NC}"
cd /var/www/voynich-backend

# Ensure we have write permissions
sudo chown -R $USER:$USER /var/www/voynich-backend
sudo chown -R $USER:$USER /var/www/voynich-backend/node_modules 2>/dev/null || true

# Install dependencies
echo "Running npm install..."
npm install

# Verify undici is installed
if npm list undici > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Dependencies installed (including undici)${NC}"
else
    echo "Installing undici..."
    npm install undici
    echo -e "${GREEN}✓ Undici installed${NC}"
fi

# Step 4: Create PM2 ecosystem file
echo ""
echo -e "${YELLOW}Step 4: Setting up PM2...${NC}"
cat > ecosystem.config.js << 'EOF'
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

# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# Step 5: Start/restart PM2 process
echo ""
echo -e "${YELLOW}Step 5: Starting backend with PM2...${NC}"

# Delete existing process if it exists
pm2 delete voynich-backend 2>/dev/null || true

# Start the process
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo -e "${GREEN}✓ PM2 process started${NC}"

# Step 6: Verify everything is working
echo ""
echo -e "${YELLOW}Step 6: Verifying setup...${NC}"

# Check PM2 status
echo ""
echo "PM2 Status:"
pm2 status

# Wait a moment for server to start
sleep 3

# Test API endpoint
echo ""
echo "Testing API endpoint..."
if curl -s http://localhost:8080/api/health > /dev/null; then
    echo -e "${GREEN}✓ Backend is responding${NC}"
    curl -s http://localhost:8080/api/health | head -3
else
    echo -e "${RED}✗ Backend is not responding${NC}"
    echo "Check logs with: pm2 logs voynich-backend"
fi

# Check logs for fetch initialization
echo ""
echo "Checking fetch initialization in logs..."
if pm2 logs voynich-backend --lines 50 --nostream | grep -i "fetch\|undici" | head -3; then
    echo -e "${GREEN}✓ Fetch appears to be initialized${NC}"
else
    echo -e "${YELLOW}⚠ Could not find fetch initialization in logs${NC}"
fi

echo ""
echo -e "${GREEN}=== Setup Complete! ==="
echo ""
echo "Next steps:"
echo "1. Check PM2 status: pm2 status"
echo "2. View logs: pm2 logs voynich-backend"
echo "3. Test API: curl http://localhost:8080/api/health"
echo "4. Restart if needed: pm2 restart voynich-backend"
echo ""

