# Quick Fix - Server Backend Issues

## Run These Commands on Your Server

### Option 1: Use the Setup Script (Recommended)

```bash
# SSH to server
ssh user@voynich.online

# Download and run setup script
cd /tmp
curl -O https://raw.githubusercontent.com/BuzzScud/ALGOV3/main/setup-backend.sh
chmod +x setup-backend.sh
./setup-backend.sh
```

### Option 2: Manual Setup (Step by Step)

```bash
# 1. Set up backend directory
sudo mkdir -p /var/www/voynich-backend
sudo chown -R $USER:$USER /var/www/voynich-backend
cd /var/www/voynich-backend

# 2. Clone or update repository
if [ -d ".git" ]; then
    git pull origin main
else
    git clone https://github.com/BuzzScud/ALGOV3.git .
fi

# 3. Install dependencies (including undici)
npm install

# 4. Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'voynich-backend',
    script: 'server.mjs',
    cwd: '/var/www/voynich-backend',
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production', PORT: 8080 },
    error_file: '/var/log/pm2/voynich-backend-error.log',
    out_file: '/var/log/pm2/voynich-backend-out.log',
    autorestart: true
  }]
};
EOF

# 5. Create log directory
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# 6. Start with PM2
pm2 delete voynich-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# 7. Verify it's working
pm2 status
pm2 logs voynich-backend --lines 20
curl http://localhost:8080/api/health
```

## Verify Everything Works

```bash
# Check PM2 status
pm2 status
# Should show "voynich-backend" as "online"

# Check logs for fetch initialization
pm2 logs voynich-backend | grep -i "fetch\|undici"
# Should see: "✓ Fetch polyfill initialized from undici"

# Test API endpoints
curl http://localhost:8080/api/health
# Should return: {"status":"ok","message":"Server is running!"}

curl "http://localhost:8080/api/quote?symbol=AAPL"
# Should return JSON with stock data

# Test through Apache proxy
curl https://voynich.online/api/health
# Should return same as above
```

## Common Issues & Fixes

### Issue: "PM2 process not found"
**Fix:**
```bash
cd /var/www/voynich-backend
pm2 start server.mjs --name voynich-backend
pm2 save
```

### Issue: "fetch is not defined"
**Fix:**
```bash
cd /var/www/voynich-backend
npm install undici
pm2 restart voynich-backend
```

### Issue: "Port 8080 already in use"
**Fix:**
```bash
# Find what's using the port
sudo lsof -i :8080
# Kill it if needed
sudo kill -9 <PID>
# Or change port in ecosystem.config.js
```

### Issue: "Permission denied"
**Fix:**
```bash
sudo chown -R $USER:$USER /var/www/voynich-backend
sudo chown -R $USER:$USER /var/log/pm2
```

## After Setup

Once the backend is running:

1. **Clear browser cache** and test the frontend
2. **Check browser console** - should see no "fetch is not defined" errors
3. **Test the trading app** - enter a symbol like "AAPL" and click "Generate Snapshot"

The backend should now be 100% functional!

