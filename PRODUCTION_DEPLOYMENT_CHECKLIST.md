# Production Deployment Checklist

## Critical Issue
The production server (`voynich.online/trading/`) is currently serving an **outdated version** of `index.html` that uses CDN resources. This is causing the error: "An error occurred trying to load the resource."

## Required Actions on Production Server

### Step 1: Pull Latest Code
```bash
cd /path/to/production/directory
git pull origin main
```

### Step 2: Verify Files Are Updated
Check that `frontend/index.html` contains:
- ❌ **NOT**: `cdn.jsdelivr.net` (old version)
- ✅ **SHOULD HAVE**: `node_modules/chart.js/dist/chart.umd.min.js` (local)
- ✅ **SHOULD HAVE**: `css/tailwind.css` (relative path)

### Step 3: Install Node Modules
```bash
# Install root dependencies (if not already done)
npm install

# Install frontend-specific dependencies
cd frontend
npm install
cd ..
```

### Step 4: Build Tailwind CSS
```bash
# From project root
npm run build:css

# OR directly
cd frontend
npx tailwindcss -i ./input.css -o ./css/tailwind.css --minify
```

### Step 5: Verify CSS File Exists
```bash
# Check file exists and has content
ls -lh frontend/css/tailwind.css
# Should show ~37KB file size
```

### Step 6: Set Correct Permissions
```bash
# Ensure Apache/www-data can read files
sudo chmod -R 755 frontend/
sudo chown -R apache:apache frontend/  # or www-data:www-data
sudo chmod 644 frontend/css/tailwind.css
```

### Step 7: Restart Server
```bash
# If using PM2
pm2 restart all

# OR restart Node.js server
# (depending on your setup)
```

### Step 8: Verify Deployment
1. Visit `https://voynich.online/trading/`
2. Open browser DevTools (F12)
3. Check Network tab:
   - ✅ Should see `tailwind.css` loading successfully (200 OK)
   - ✅ Should see `chart.umd.min.js` from local path (NOT cdn.jsdelivr.net)
   - ❌ Should NOT see any red/failed resources

## Expected vs Current State

### ❌ Current (Broken) State
- Resources loading from `cdn.jsdelivr.net`
- `tailwind.css` failing to load (red icon)
- Error: "An error occurred trying to load the resource"

### ✅ Expected (Fixed) State
- All resources loading from local `node_modules`
- `tailwind.css` loading successfully
- No errors in console
- Page displays correctly with styling

## Troubleshooting

### If CSS still fails to load:
1. Check file exists: `ls -la frontend/css/tailwind.css`
2. Check server can serve it: `curl http://localhost:8080/trading/css/tailwind.css`
3. Check Apache/nginx configuration allows serving CSS files
4. Clear browser cache (Ctrl+Shift+R)

### If node_modules aren't accessible:
1. Verify node_modules are installed: `ls -la node_modules/chart.js`
2. Check server static file configuration in `backend/server.mjs`
3. Verify file permissions allow server to read node_modules

### If old CDN links still appear:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache completely
3. Verify `index.html` on server has latest code
4. Check if there's a caching layer (CDN, proxy) that needs clearing

## Quick Verification Commands

```bash
# Check if index.html uses local resources
grep -i "cdn\|jsdelivr" frontend/index.html
# Should return NO results

# Check if index.html uses local node_modules
grep "node_modules" frontend/index.html
# Should show: node_modules/chart.js, node_modules/preline, etc.

# Check CSS file exists
test -f frontend/css/tailwind.css && echo "CSS file exists" || echo "CSS file MISSING"

# Check file size (should be ~37KB)
ls -lh frontend/css/tailwind.css
```

## Contact Points
- Server location: Production server at `voynich.online`
- Files location: `/var/www/html/trading/` or similar
- Logs: Check server logs for 404 errors on `/trading/css/tailwind.css`

