# Backend Deployment Package

This directory contains all the files needed to deploy the backend server.

## Files Included

- `server.mjs` - Main Node.js server file
- `package.json` - Dependencies configuration
- `package-lock.json` - Dependency version lock file
- `ecosystem.config.cjs` - PM2 process manager configuration (CommonJS format)
- `deploy-backend.sh` - Automated deployment script

## Quick Deployment

### Option 1: Run from this directory (Recommended)

```bash
# Navigate to backend directory
cd backend

# Run deployment script
./deploy-backend.sh
```

### Option 2: Run from anywhere

```bash
# Provide full path to backend directory
/path/to/ALGOV3-main/backend/deploy-backend.sh
```

### Option 3: Run from server (if files are already on server)

```bash
# If you've copied the backend/ directory to the server
cd /path/to/backend
./deploy-backend.sh
```

## What the Script Does

1. ✅ Creates `/var/www/voynich-backend` directory
2. ✅ Copies all backend files to target location
3. ✅ Fixes file permissions
4. ✅ Installs npm dependencies (including `undici`)
5. ✅ Creates PM2 configuration
6. ✅ Sets up log directory
7. ✅ Starts backend with PM2
8. ✅ Verifies deployment

## Manual Deployment (if script fails)

```bash
# 1. Create directory
sudo mkdir -p /var/www/voynich-backend
sudo chown -R $USER:$USER /var/www/voynich-backend

# 2. Copy files
cp server.mjs package.json package-lock.json ecosystem.config.js /var/www/voynich-backend/

# 3. Install dependencies
cd /var/www/voynich-backend
npm install

# 4. Start with PM2
pm2 start ecosystem.config.cjs
pm2 save
```

## Verification

After deployment, verify everything works:

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs voynich-backend --lines 30

# Test API
curl http://localhost:8080/api/health
```

## Requirements

- Node.js 18+ installed
- npm installed
- PM2 installed globally (`npm install -g pm2`)
- Write permissions to `/var/www/voynich-backend`
- Write permissions to `/var/log/pm2`

## Troubleshooting

### Permission Errors
```bash
sudo chown -R $USER:$USER /var/www/voynich-backend
sudo chown -R $USER:$USER /var/log/pm2
```

### PM2 Not Found
```bash
sudo npm install -g pm2
```

### Port Already in Use
```bash
sudo lsof -i :8080
sudo kill -9 <PID>
```

