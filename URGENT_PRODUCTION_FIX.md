# 🚨 URGENT: Production Deployment Required

## Current Problem

The production server at `voynich.online/trading/` is serving an **outdated `index.html`** file that:
- ❌ Still uses CDN resources (`cdn.jsdelivr.net`)
- ❌ Causes CSS file to fail loading (red icon in dev tools)
- ❌ Shows error: "An error occurred trying to load the resource"

## Root Cause

**The production server has NOT been updated with the latest code** that uses local resources instead of CDNs.

## Solution: Deploy Latest Code to Production

### Step 1: SSH into Production Server
```bash
ssh user@voynich.online
# Or however you access your production server
```

### Step 2: Navigate to Project Directory
```bash
cd /path/to/project  # e.g., /var/www/html/trading or wherever your code is
```

### Step 3: Pull Latest Code from Git
```bash
git pull origin main
# OR if not a git repo, manually copy the latest files
```

### Step 4: Install Dependencies
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 5: Build CSS File
```bash
npm run build:css
# This creates frontend/css/tailwind.css
```

### Step 6: Verify Files Are Updated
```bash
# Check that index.html uses local resources (NOT CDN)
grep -i "cdn\|jsdelivr" frontend/index.html
# Should return NOTHING (empty)

# Check that index.html uses node_modules
grep "node_modules" frontend/index.html
# Should show: node_modules/chart.js, etc.

# Check CSS file exists and has content
ls -lh frontend/css/tailwind.css
# Should show ~37KB file
```

### Step 7: Set Permissions
```bash
sudo chmod -R 755 frontend/
sudo chown -R apache:apache frontend/  # or www-data:www-data
```

### Step 8: Restart Server
```bash
# If using PM2
pm2 restart all

# OR restart your Node.js server process
```

### Step 9: Clear Browser Cache
1. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Or clear cache completely in browser settings

### Step 10: Verify Fix
Visit `https://voynich.online/trading/` and:
1. Open DevTools (F12)
2. Go to Network tab
3. Refresh page
4. ✅ Should see `tailwind.css` load successfully (200 OK, NOT red)
5. ✅ Should see `chart.umd.min.js` from local path (NOT cdn.jsdelivr.net)
6. ✅ No errors in console

## Quick Verification Script

Run this on the production server to check everything:

```bash
#!/bin/bash
echo "=== Checking Production Deployment ==="

echo "1. Checking index.html for CDN links..."
if grep -qi "cdn\|jsdelivr" frontend/index.html; then
    echo "   ❌ FAIL: Still contains CDN links!"
else
    echo "   ✅ PASS: No CDN links found"
fi

echo "2. Checking for local node_modules references..."
if grep -q "node_modules" frontend/index.html; then
    echo "   ✅ PASS: Uses local node_modules"
else
    echo "   ❌ FAIL: Not using local node_modules"
fi

echo "3. Checking CSS file exists..."
if [ -f "frontend/css/tailwind.css" ]; then
    SIZE=$(ls -lh frontend/css/tailwind.css | awk '{print $5}')
    echo "   ✅ PASS: CSS file exists (size: $SIZE)"
else
    echo "   ❌ FAIL: CSS file missing!"
fi

echo "4. Checking node_modules exist..."
if [ -d "node_modules/chart.js" ]; then
    echo "   ✅ PASS: Chart.js installed"
else
    echo "   ❌ FAIL: Chart.js missing"
fi

echo "=== Check Complete ==="
```

## What Should Change

### Before (Current - Broken):
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.2.0/dist/chartjs-plugin-zoom.min.js"></script>
```

### After (Fixed):
```html
<link href="css/tailwind.css" rel="stylesheet">
<script src="node_modules/chart.js/dist/chart.umd.min.js"></script>
<script src="node_modules/chartjs-plugin-zoom/dist/chartjs-plugin-zoom.min.js"></script>
<script src="node_modules/preline/dist/preline.js"></script>
```

## Why This Happened

1. Code was updated locally ✅
2. Code was committed to Git ✅
3. Code was pushed to Git ✅
4. **BUT production server was NOT updated** ❌

Production is still running the old version of `index.html` that references CDN resources.

## After Deployment

Once you've deployed the latest code, the error should disappear because:
- ✅ `index.html` will use local resources
- ✅ CSS file will be accessible at the correct path
- ✅ All dependencies will be served from `node_modules`

## Need Help?

If the error persists after deployment:
1. Check server logs for 404 errors
2. Verify file permissions
3. Check Apache/nginx configuration
4. Verify the `base href` is correctly set in `index.html`

