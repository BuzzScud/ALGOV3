#!/bin/bash
# Complete backend setup script for voynich.online server

set -e

echo "=== Setting up Voynich Backend ==="

# Navigate to backend directory
if [ ! -d "/var/www/voynich-backend" ]; then
    echo "Creating backend directory..."
    sudo mkdir -p /var/www/voynich-backend
    sudo chown -R $USER:$USER /var/www/voynich-backend
    cd /var/www/voynich-backend
    git clone https://github.com/BuzzScud/ALGOV3.git .
else
    cd /var/www/voynich-backend
fi

# Pull latest code
echo "Pulling latest code..."
git pull origin main || (git fetch origin main && git reset --hard origin/main)

# Install dependencies
echo "Installing dependencies..."
npm install

# Verify undici is installed
if ! npm list undici > /dev/null 2>&1; then
    echo "Installing undici..."
    npm install undici
fi

# Create PM2 ecosystem file
echo "Creating PM2 configuration..."
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

# Stop existing process if running
pm2 delete voynich-backend 2>/dev/null || true

# Start with PM2
echo "Starting backend with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Show status
echo ""
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Recent Logs ==="
sleep 2
pm2 logs voynich-backend --lines 20 --nostream

echo ""
echo "=== Testing API ==="
sleep 2
if curl -s http://localhost:8080/api/health > /dev/null; then
    echo "✓ Health endpoint working"
    curl -s http://localhost:8080/api/health
else
    echo "✗ Health endpoint not responding"
fi

echo ""
echo "=== Setup Complete! ==="
echo "Backend should now be running on port 8080"
echo "Check logs with: pm2 logs voynich-backend"
echo "Restart with: pm2 restart voynich-backend"

