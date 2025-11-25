# Server Deployment Guide - Fix Backend Issues

## Issues Identified from Screenshot

1. ❌ PM2 process `voynich-backend` not found
2. ❌ `/var/www/voynich-backend` is not a git repository
3. ❌ Backend server not running (causing 400/408 errors)
4. ❌ "fetch is not defined" errors in API responses

## Complete Server Setup Instructions

### Step 1: Set Up Backend Directory

```bash
# SSH to your server
ssh user@voynich.online

# Create backend directory if it doesn't exist
sudo mkdir -p /var/www/voynich-backend
sudo chown -R $USER:$USER /var/www/voynich-backend

# Navigate to backend directory
cd /var/www/voynich-backend

# Initialize git repository (if not already)
git init
git remote add origin https://github.com/BuzzScud/ALGOV3.git
git pull origin main

# OR if you prefer to clone fresh:
# cd /var/www
# rm -rf voynich-backend
# git clone https://github.com/BuzzScud/ALGOV3.git voynich-backend
# cd voynich-backend
```

### Step 2: Install Dependencies

```bash
cd /var/www/voynich-backend

# Install Node.js dependencies (including undici)
npm install

# Verify undici is installed
npm list undici
```

### Step 3: Set Up PM2

```bash
# Install PM2 globally if not already installed
sudo npm install -g pm2

# Create PM2 ecosystem file
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

# Start the backend with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on system boot
pm2 startup
# Follow the instructions it prints (usually involves running a sudo command)
```

### Step 4: Verify Backend is Running

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs voynich-backend --lines 50

# Test API endpoints
curl http://localhost:8080/api/health
curl "http://localhost:8080/api/quote?symbol=AAPL"

# Check if fetch is working (should see "✓ Fetch polyfill initialized from undici" in logs)
pm2 logs voynich-backend | grep -i fetch
```

### Step 5: Update Backend Code

```bash
cd /var/www/voynich-backend

# Pull latest code
git pull origin main

# Install any new dependencies
npm install

# Restart PM2 process
pm2 restart voynich-backend

# Check logs for errors
pm2 logs voynich-backend --lines 50
```

### Step 6: Verify Apache Proxy Configuration

Ensure Apache is configured to proxy `/api/*` to `http://localhost:8080/api/`:

```bash
# Check Apache vhost configuration
sudo cat /etc/httpd/conf.d/httpd.conf.d-voynich.online.conf | grep -A 5 ProxyPass

# Should see:
# ProxyPass /api http://localhost:8080/api
# ProxyPassReverse /api http://localhost:8080/api

# If not configured, add to vhost:
sudo vi /etc/httpd/conf.d/httpd.conf.d-voynich.online.conf

# Add these lines after <Directory> section:
# ProxyPreserveHost On
# ProxyPass /api http://localhost:8080/api
# ProxyPassReverse /api http://localhost:8080/api
# ProxyTimeout 300

# Test Apache configuration
sudo apachectl configtest

# Restart Apache
sudo systemctl restart httpd
```

### Step 7: Test Everything

```bash
# Test backend directly
curl http://localhost:8080/api/health

# Test through Apache proxy
curl https://voynich.online/api/health

# Test quote endpoint
curl "https://voynich.online/api/quote?symbol=AAPL"

# Both should return JSON responses
```

## Troubleshooting

### PM2 Process Not Found

```bash
# Check if process exists with different name
pm2 list

# If it doesn't exist, start it:
cd /var/www/voynich-backend
pm2 start server.mjs --name voynich-backend
pm2 save
```

### "fetch is not defined" Errors

```bash
# Check if undici is installed
cd /var/www/voynich-backend
npm list undici

# If not installed:
npm install undici

# Restart PM2
pm2 restart voynich-backend

# Check logs for fetch initialization
pm2 logs voynich-backend | grep -i "fetch\|undici"
```

### Port Already in Use

```bash
# Check what's using port 8080
sudo lsof -i :8080

# Kill the process if needed
sudo kill -9 <PID>

# Or change port in ecosystem.config.js and restart
```

### Permission Errors

```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/voynich-backend
sudo chown -R $USER:$USER /var/log/pm2

# Fix npm permissions (if needed)
sudo chown -R $USER:$USER ~/.npm
```

## Quick Fix Script

Run this complete setup script:

```bash
#!/bin/bash
# Complete backend setup script

set -e

echo "=== Setting up Voynich Backend ==="

# Navigate to backend directory
cd /var/www/voynich-backend || {
    echo "Creating backend directory..."
    sudo mkdir -p /var/www/voynich-backend
    sudo chown -R $USER:$USER /var/www/voynich-backend
    cd /var/www/voynich-backend
    git clone https://github.com/BuzzScud/ALGOV3.git .
}

# Pull latest code
echo "Pulling latest code..."
git pull origin main || git fetch origin main && git reset --hard origin/main

# Install dependencies
echo "Installing dependencies..."
npm install

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
pm2 logs voynich-backend --lines 20 --nostream

echo ""
echo "=== Testing API ==="
sleep 2
curl -s http://localhost:8080/api/health | head -5

echo ""
echo "=== Setup Complete! ==="
echo "Backend should now be running on port 8080"
echo "Check logs with: pm2 logs voynich-backend"
```

Save this as `setup-backend.sh` and run:
```bash
chmod +x setup-backend.sh
./setup-backend.sh
```

