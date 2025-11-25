#!/bin/bash
# Quick server update script - fixes "fetch is not defined" errors

set -e

echo "=== Updating Backend Server ==="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Navigate to backend
cd /var/www/voynich-backend || {
    echo -e "${RED}Error: /var/www/voynich-backend does not exist${NC}"
    echo "Creating directory..."
    sudo mkdir -p /var/www/voynich-backend
    sudo chown -R $USER:$USER /var/www/voynich-backend
    cd /var/www/voynich-backend
    git clone https://github.com/BuzzScud/ALGOV3.git .
}

# Step 2: Fix permissions
echo -e "${YELLOW}Fixing permissions...${NC}"
sudo chown -R $USER:$USER /var/www/voynich-backend

# Step 3: Update code
echo -e "${YELLOW}Updating code from GitHub...${NC}"
if [ -d ".git" ]; then
    git pull origin main || {
        echo "Git pull failed, resetting..."
        git fetch origin main
        git reset --hard origin/main
    }
else
    echo "Initializing git repository..."
    git init
    git remote add origin https://github.com/BuzzScud/ALGOV3.git
    git fetch origin main
    git reset --hard origin/main
fi

# Step 4: Install dependencies (CRITICAL - includes undici)
echo -e "${YELLOW}Installing dependencies (including undici)...${NC}"
npm install

# Verify undici is installed
if npm list undici > /dev/null 2>&1; then
    echo -e "${GREEN}✓ undici is installed${NC}"
else
    echo -e "${RED}✗ undici not found, installing...${NC}"
    npm install undici
fi

# Step 5: Restart PM2
echo -e "${YELLOW}Restarting backend with PM2...${NC}"

# Create PM2 config if it doesn't exist
if [ ! -f "ecosystem.config.js" ]; then
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
fi

# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# Restart PM2
pm2 delete voynich-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Step 6: Verify
echo ""
echo -e "${YELLOW}Verifying backend is working...${NC}"
sleep 3

# Check PM2 status
echo ""
echo "PM2 Status:"
pm2 status | grep voynich-backend || echo "Process not found!"

# Check logs for fetch initialization
echo ""
echo "Checking fetch initialization in logs:"
pm2 logs voynich-backend --lines 20 --nostream | grep -i "fetch\|undici" || echo "No fetch logs found"

# Test API
echo ""
echo "Testing API endpoint:"
if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is responding${NC}"
    curl -s http://localhost:8080/api/health
else
    echo -e "${RED}✗ Backend is not responding${NC}"
    echo "Check logs with: pm2 logs voynich-backend"
fi

echo ""
echo -e "${GREEN}=== Update Complete! ==="
echo ""
echo "If you still see 'fetch is not defined' errors:"
echo "1. Check logs: pm2 logs voynich-backend --lines 50"
echo "2. Verify undici: npm list undici"
echo "3. Restart: pm2 restart voynich-backend"
echo ""

