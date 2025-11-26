# Production Deployment Instructions

## Quick Fix for Production Display Issues

The frontend code has been fixed but needs to be deployed to production. Follow these steps:

### Option 1: Using Git (Recommended)

SSH to your production server and run:

```bash
# Navigate to frontend directory
cd /var/www/html/trading

# Pull latest code
git pull origin main

# If it's not a git repository, initialize it:
# git init
# git remote add origin https://github.com/BuzzScud/ALGOV3.git
# git fetch origin
# git checkout -b main origin/main

# Set correct permissions
sudo chown -R apache:apache /var/www/html/trading
sudo chmod -R 755 /var/www/html/trading
```

### Option 2: Using Deployment Script

From your local machine or server:

```bash
# Clone the repository if needed
cd /tmp
git clone https://github.com/BuzzScud/ALGOV3.git
cd ALGOV3

# Run the deployment script
chmod +x scripts/deploy-frontend.sh
sudo ./scripts/deploy-frontend.sh
```

### Option 3: Manual Update

If you need to manually copy files:

```bash
# On your local machine
cd /path/to/ALGOV3

# Copy frontend files to server
scp -r frontend/* user@voynich.online:/tmp/trading-frontend/

# On the server
sudo cp -r /tmp/trading-frontend/* /var/www/html/trading/
sudo chown -R apache:apache /var/www/html/trading
sudo chmod -R 755 /var/www/html/trading
```

## What Was Fixed

1. **CSS Path**: Changed base href and CSS path to correctly load Tailwind CSS
2. **Canvas Event Listeners**: Fixed JavaScript errors with canvas panning
3. **Button Event Listeners**: Added null checks to prevent errors
4. **Server Static Files**: Updated server to serve from project root

## Verify Deployment

After deployment, verify:

1. **Check file exists**:
   ```bash
   ls -la /var/www/html/trading/index.html
   ```

2. **Check CSS file**:
   ```bash
   ls -la /var/www/html/trading/css/tailwind.css
   ```

3. **Check base href in index.html**:
   ```bash
   grep "base href" /var/www/html/trading/index.html
   ```
   Should show: `<base href="/frontend/">` or `<base href="/trading/">`

4. **Clear browser cache** and test the website

## If Issues Persist

1. **Check Apache is serving files correctly**:
   ```bash
   curl -I https://voynich.online/trading/index.html
   ```

2. **Check file permissions**:
   ```bash
   ls -la /var/www/html/trading/
   ```

3. **Check browser console** for JavaScript errors

4. **Verify backend is running**:
   ```bash
   pm2 status
   curl http://localhost:8080/api/health
   ```

## Backend Update (if needed)

If backend also needs updating:

```bash
cd /var/www/voynich-backend
git pull origin main
npm install
pm2 restart voynich-backend
```


