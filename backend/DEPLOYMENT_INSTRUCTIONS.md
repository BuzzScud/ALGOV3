# Backend Deployment Instructions

## For Server Administrator

This directory contains all files needed to deploy the backend server to `/var/www/voynich-backend`.

## Quick Start

### Step 1: Copy Backend Directory to Server

**Option A: Using Git (Recommended)**
```bash
# On the server
cd /var/www
git clone https://github.com/BuzzScud/ALGOV3.git temp-backend
cp -r temp-backend/backend /var/www/backend-deploy
cd /var/www/backend-deploy
```

**Option B: Using SCP**
```bash
# From your local machine
scp -r backend/ user@voynich.online:/tmp/backend
```

### Step 2: Run Deployment Script

```bash
# Navigate to backend directory
cd /var/www/backend-deploy
# OR if using SCP:
cd /tmp/backend

# Make script executable (if needed)
chmod +x deploy-backend.sh

# Run deployment script
./deploy-backend.sh
```

The script will:
- ✅ Create `/var/www/voynich-backend` directory
- ✅ Copy all files to the correct location
- ✅ Fix permissions
- ✅ Install all dependencies (including `undici`)
- ✅ Configure PM2
- ✅ Start the backend server
- ✅ Verify everything is working

## What Gets Deployed

The script deploys these files to `/var/www/voynich-backend`:

```
/var/www/voynich-backend/
├── server.mjs              ← Main server code
├── package.json            ← Dependencies
├── package-lock.json       ← Dependency versions
├── ecosystem.config.cjs    ← PM2 configuration (CommonJS format)
└── node_modules/           ← Installed via npm install
    └── undici/             ← CRITICAL: fetch polyfill
```

## Verification

After running the script, verify deployment:

```bash
# Check PM2 status
pm2 status

# Should show: voynich-backend | online

# Check logs
pm2 logs voynich-backend --lines 30

# Should see: "✓ Fetch polyfill initialized from undici"

# Test API
curl http://localhost:8080/api/health

# Should return: {"status":"ok","message":"Server is running!"}
```

## Requirements

Before running the script, ensure:

- ✅ Node.js 18+ is installed (`node --version`)
- ✅ npm is installed (`npm --version`)
- ✅ PM2 is installed globally (`npm install -g pm2`)
- ✅ User has sudo privileges
- ✅ Port 8080 is available

## Troubleshooting

### Script Fails with Permission Error
```bash
# Fix permissions
sudo chown -R $USER:$USER /var/www/voynich-backend
sudo chown -R $USER:$USER /var/log/pm2
```

### PM2 Not Found
```bash
# Install PM2 globally
sudo npm install -g pm2
```

### Port 8080 Already in Use
```bash
# Find what's using the port
sudo lsof -i :8080

# Kill the process if needed
sudo kill -9 <PID>
```

### Dependencies Won't Install
```bash
# Fix npm permissions
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER /var/www/voynich-backend
```

## Manual Deployment (Alternative)

If the script doesn't work, you can deploy manually:

```bash
# 1. Create directory
sudo mkdir -p /var/www/voynich-backend
sudo chown -R $USER:$USER /var/www/voynich-backend

# 2. Copy files
cp server.mjs package.json package-lock.json ecosystem.config.cjs /var/www/voynich-backend/

# 3. Install dependencies
cd /var/www/voynich-backend
npm install

# 4. Create log directory
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# 5. Start with PM2
pm2 start ecosystem.config.cjs
pm2 save

# 6. Verify
pm2 status
curl http://localhost:8080/api/health
```

## After Deployment

Once deployed, the backend will:
- Run on port 8080
- Be managed by PM2 (auto-restarts on crash)
- Log to `/var/log/pm2/voynich-backend-*.log`
- Be accessible at `http://localhost:8080/api/*`

Make sure Apache is configured to proxy `/api/*` to `http://localhost:8080/api/`.

