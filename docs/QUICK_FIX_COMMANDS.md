# Quick Fix Commands for Server Issues

## Run This on Your Server

### Option 1: Use the Automated Fix Script (EASIEST)

```bash
# SSH to server
ssh buzzscud@voynich.online

# Download and run the fix script
cd /tmp
curl -O https://raw.githubusercontent.com/BuzzScud/ALGOV3/main/FIX_SERVER_ISSUES.sh
chmod +x FIX_SERVER_ISSUES.sh
./FIX_SERVER_ISSUES.sh
```

### Option 2: Manual Fix (Step by Step)

```bash
# 1. Fix permissions
sudo chown -R $USER:$USER /var/www/voynich-backend

# 2. Set up git repository
cd /var/www/voynich-backend

# If directory exists but is not a git repo:
if [ ! -d ".git" ]; then
    # Option A: Initialize and pull
    git init
    git remote add origin https://github.com/BuzzScud/ALGOV3.git
    git fetch origin main
    git reset --hard origin/main
    # OR Option B: Remove and clone fresh
    # cd /var/www
    # sudo rm -rf voynich-backend
    # git clone https://github.com/BuzzScud/ALGOV3.git voynich-backend
    # sudo chown -R $USER:$USER voynich-backend
    # cd voynich-backend
fi

# If it's already a git repo, just pull:
git pull origin main

# 3. Fix permissions again (important!)
sudo chown -R $USER:$USER /var/www/voynich-backend
sudo chown -R $USER:$USER /var/www/voynich-backend/node_modules 2>/dev/null || true

# 4. Install dependencies
npm install

# 5. Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'voynich-backend',
    script: 'server.mjs',
    cwd: '/var/www/voynich-backend',
    env: { NODE_ENV: 'production', PORT: 8080 },
    autorestart: true
  }]
};
EOF

# 6. Create log directory
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# 7. Start with PM2
pm2 delete voynich-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# 8. Verify
pm2 status
curl http://localhost:8080/api/health
```

## What Each Issue Means

### Issue 1: "fatal: not a git repository"
**Cause:** `/var/www/voynich-backend` is not initialized as a git repository  
**Fix:** Initialize git or clone the repository

### Issue 2: "EACCES: permission denied"
**Cause:** User doesn't have write permissions to `/var/www/voynich-backend`  
**Fix:** Run `sudo chown -R $USER:$USER /var/www/voynich-backend`

### Issue 3: "PM2 process not found"
**Cause:** PM2 process was never started or was deleted  
**Fix:** Start the process with `pm2 start ecosystem.config.js`

## Verification Commands

After running the fix, verify everything works:

```bash
# Check PM2 status
pm2 status
# Should show "voynich-backend" as "online"

# Check logs
pm2 logs voynich-backend --lines 20
# Should see: "✓ Fetch polyfill initialized from undici"

# Test API
curl http://localhost:8080/api/health
# Should return: {"status":"ok","message":"Server is running!"}

# Test through Apache proxy
curl https://voynich.online/api/health
# Should return same as above
```

## If Something Still Fails

### Permission errors persist:
```bash
sudo chown -R $USER:$USER /var/www/voynich-backend
sudo chown -R $USER:$USER ~/.npm
```

### Git still fails:
```bash
cd /var/www
sudo rm -rf voynich-backend
git clone https://github.com/BuzzScud/ALGOV3.git voynich-backend
sudo chown -R $USER:$USER voynich-backend
cd voynich-backend
npm install
```

### PM2 still can't start:
```bash
# Check if port 8080 is in use
sudo lsof -i :8080

# Kill process if needed
sudo kill -9 <PID>

# Start PM2 manually
cd /var/www/voynich-backend
pm2 start server.mjs --name voynich-backend
pm2 save
```

