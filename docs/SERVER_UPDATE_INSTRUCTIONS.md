# Server Update Instructions - Fix "fetch is not defined" Errors

## Current Issue

The backend server is still running old code that doesn't have `undici` installed. The errors show:
- `"details":"fetch is not defined"` in API responses
- HTTP 500 errors for `/api/history`
- HTTP 400 errors for `/api/tetration-projection`

## Solution: Update Server Code

The code has been fixed, but the server needs to be updated. Follow these steps:

### Step 1: SSH to Server

```bash
ssh buzzscud@voynich.online
```

### Step 2: Fix Backend Directory

```bash
# Navigate to backend directory
cd /var/www/voynich-backend

# If directory doesn't exist or isn't a git repo, set it up:
if [ ! -d ".git" ]; then
    # Option A: Initialize git
    git init
    git remote add origin https://github.com/BuzzScud/ALGOV3.git
    git fetch origin main
    git reset --hard origin/main
    # OR Option B: Clone fresh
    # cd /var/www
    # sudo rm -rf voynich-backend
    # git clone https://github.com/BuzzScud/ALGOV3.git voynich-backend
    # cd voynich-backend
fi

# Pull latest code
git pull origin main
```

### Step 3: Fix Permissions

```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/voynich-backend
sudo chown -R $USER:$USER /var/www/voynich-backend/node_modules 2>/dev/null || true
```

### Step 4: Install Dependencies (CRITICAL - includes undici)

```bash
cd /var/www/voynich-backend

# Install all dependencies including undici
npm install

# Verify undici is installed
npm list undici
# Should show: undici@7.x.x
```

### Step 5: Restart Backend with PM2

```bash
# Create PM2 config if it doesn't exist
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

# Stop existing process
pm2 delete voynich-backend 2>/dev/null || true

# Start backend
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save
```

### Step 6: Verify Backend is Working

```bash
# Check PM2 status
pm2 status
# Should show "voynich-backend" as "online"

# Check logs for fetch initialization
pm2 logs voynich-backend --lines 30
# Should see: "✓ Fetch polyfill initialized from undici"

# Test API endpoints
curl http://localhost:8080/api/health
# Should return: {"status":"ok","message":"Server is running!"}

curl "http://localhost:8080/api/quote?symbol=AAPL"
# Should return JSON with stock data (no "fetch is not defined" error)

curl "http://localhost:8080/api/history?symbol=AAPL&range=1mo&interval=1d"
# Should return JSON with historical data (no "fetch is not defined" error)
```

### Step 7: Test Through Apache Proxy

```bash
# Test through Apache
curl https://voynich.online/api/health
curl "https://voynich.online/api/quote?symbol=AAPL"
```

## Quick One-Liner Fix

If you want to do everything at once:

```bash
cd /var/www/voynich-backend && \
sudo chown -R $USER:$USER . && \
(git pull origin main || (git init && git remote add origin https://github.com/BuzzScud/ALGOV3.git && git fetch origin main && git reset --hard origin/main)) && \
npm install && \
cat > ecosystem.config.js << 'EOFPM2'
module.exports = {
  apps: [{
    name: 'voynich-backend',
    script: 'server.mjs',
    cwd: '/var/www/voynich-backend',
    env: { NODE_ENV: 'production', PORT: 8080 },
    autorestart: true
  }]
};
EOFPM2
sudo mkdir -p /var/log/pm2 && sudo chown -R $USER:$USER /var/log/pm2 && \
pm2 delete voynich-backend 2>/dev/null; pm2 start ecosystem.config.js && pm2 save && \
sleep 3 && curl http://localhost:8080/api/health
```

## What to Look For in Logs

After restarting, check logs for these success messages:

```bash
pm2 logs voynich-backend --lines 50
```

**Expected output:**
```
✓ Fetch polyfill initialized from undici
✓ Fetch function ready: YES
🚀 Server running on http://localhost:8080
```

**If you see errors:**
- `CRITICAL ERROR: fetch is not available after undici import!` → undici not installed, run `npm install`
- `Cannot find module 'undici'` → undici not installed, run `npm install`
- `EACCES: permission denied` → fix permissions with `sudo chown -R $USER:$USER /var/www/voynich-backend`

## After Update

Once the backend is updated and running:

1. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Test the application** - enter "AAPL" and click "Generate Snapshot"
3. **Check browser console** - should see NO "fetch is not defined" errors
4. **Verify API calls work** - chart should load with data

The backend should now be 100% functional!

