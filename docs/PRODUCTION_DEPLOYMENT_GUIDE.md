# Production Deployment Guide - Complete Fix

## Summary of Changes

All CDN dependencies have been replaced with local files from the repository:
- ✅ Chart.js - Now served from `/trading/node_modules/chart.js/dist/chart.umd.min.js`
- ✅ chartjs-plugin-zoom - Now served from `/trading/node_modules/chartjs-plugin-zoom/dist/chartjs-plugin-zoom.min.js`
- ✅ Preline UI - Now served from `/trading/node_modules/preline/dist/preline.js`
- ✅ Tailwind CSS - Built and served from `/trading/css/tailwind.css`

## Critical: Production Deployment Steps

### Step 1: Update Frontend Files

SSH to your production server and run:

```bash
cd /var/www/html/trading

# Pull latest code
git pull origin main

# OR if not a git repo, copy files manually from the repository
```

### Step 2: Install Frontend Dependencies

```bash
cd /var/www/html/trading

# Install dependencies (creates node_modules directory)
npm install

# This will install:
# - chart.js@4.5.1
# - chartjs-plugin-zoom@2.2.0
# - preline@3.2.3
# - tailwindcss@3.4.18 (dev dependency)
```

### Step 3: Build Tailwind CSS

```bash
cd /var/www/html/trading

# Build the CSS file
npx tailwindcss -i ./input.css -o ./css/tailwind.css --minify

# Verify the file was created
ls -lh css/tailwind.css
```

### Step 4: Verify File Structure

Ensure these files exist:

```
/var/www/html/trading/
├── index.html                    ✅
├── css/
│   └── tailwind.css             ✅ (must be built)
├── js/
│   └── app.js                   ✅
├── input.css                    ✅
├── tailwind.config.js           ✅
├── package.json                 ✅
├── package-lock.json            ✅
└── node_modules/                ✅ (created by npm install)
    ├── chart.js/
    │   └── dist/
    │       └── chart.umd.min.js ✅
    ├── chartjs-plugin-zoom/
    │   └── dist/
    │       └── chartjs-plugin-zoom.min.js ✅
    └── preline/
        └── dist/
            └── preline.js       ✅
```

### Step 5: Set Permissions

```bash
cd /var/www/html/trading

# Set correct ownership (adjust user if needed)
sudo chown -R apache:apache /var/www/html/trading
# OR if using www-data:
# sudo chown -R www-data:www-data /var/www/html/trading

# Set correct permissions
sudo chmod -R 755 /var/www/html/trading
```

### Step 6: Configure Apache to Serve node_modules

Add this to your Apache vhost configuration (`/etc/httpd/conf.d/httpd.conf.d-voynich.online.conf`):

```apache
# Serve node_modules directory
<Directory "/var/www/html/trading/node_modules">
    Options -Indexes
    AllowOverride None
    Require all granted
</Directory>

# Ensure correct MIME types for JavaScript files
<LocationMatch "\.js$">
    Header set Content-Type "application/javascript"
</LocationMatch>
```

Then restart Apache:

```bash
sudo apachectl configtest
sudo systemctl restart httpd
```

### Step 7: Verify Files Are Accessible

Test that all files are accessible:

```bash
# Test CSS file
curl -I https://voynich.online/trading/css/tailwind.css
# Should return: HTTP/1.1 200 OK

# Test Chart.js
curl -I https://voynich.online/trading/node_modules/chart.js/dist/chart.umd.min.js
# Should return: HTTP/1.1 200 OK

# Test chartjs-plugin-zoom
curl -I https://voynich.online/trading/node_modules/chartjs-plugin-zoom/dist/chartjs-plugin-zoom.min.js
# Should return: HTTP/1.1 200 OK

# Test Preline
curl -I https://voynich.online/trading/node_modules/preline/dist/preline.js
# Should return: HTTP/1.1 200 OK
```

## Quick Deployment Script

You can also use the deployment script:

```bash
cd /tmp
git clone https://github.com/BuzzScud/ALGOV3.git
cd ALGOV3
chmod +x scripts/deploy-frontend.sh
sudo ./scripts/deploy-frontend.sh
```

This script will:
1. Copy/update frontend files
2. Install node_modules
3. Build Tailwind CSS
4. Set correct permissions

## Troubleshooting

### CSS File Returns 404

**Issue**: `GET /trading/css/tailwind.css net::ERR_ABORTED 404`

**Fix**:
```bash
cd /var/www/html/trading
npx tailwindcss -i ./input.css -o ./css/tailwind.css --minify
sudo chmod 644 css/tailwind.css
```

### node_modules Returns 403 Forbidden

**Issue**: Apache blocks access to node_modules

**Fix**: Add Directory configuration (see Step 6 above)

### node_modules Returns 404

**Issue**: node_modules not installed

**Fix**:
```bash
cd /var/www/html/trading
npm install
```

### JavaScript Errors After Deployment

**Issue**: Browser console shows module loading errors

**Fix**:
1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Check that all node_modules files are accessible
3. Verify base href in index.html is `/trading/`
4. Check Apache error logs: `sudo tail -f /var/log/httpd/error_log`

## What Changed

### Before (CDN - Broken):
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"></script>
```

### After (Local - Fixed):
```html
<script src="/trading/node_modules/chart.js/dist/chart.umd.min.js"></script>
```

All dependencies are now:
- ✅ Stored in the repository
- ✅ Installed via npm
- ✅ Served locally (no external dependencies)
- ✅ Fully under your control

## Next Steps After Deployment

1. Clear browser cache completely
2. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
3. Check browser console - should see no 404 errors
4. Verify CSS is loading (page should have dark theme styling)
5. Test chart functionality

---

**All code changes have been committed and pushed to GitHub.**

