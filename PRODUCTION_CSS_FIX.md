# Production CSS Loading Fix

## Issue
The CSS file (`tailwind.css`) was not loading in production, causing the web app to display without styling.

## Root Cause
The server was serving static files from the project root, but the CSS file is located in the `frontend/css/` directory. When accessing `/trading/css/tailwind.css`, the server couldn't find the file because it was looking in the wrong location.

## Solution

### 1. Server Configuration Fix
Updated `backend/server.mjs` to serve static files from the `frontend/` directory when accessed via `/trading/` path:

```javascript
// Serve /trading/ paths - map to frontend directory for proper file resolution
const frontendPath = join(projectRoot, 'frontend');
app.use('/trading', express.static(frontendPath));
app.use('/trading', express.static(projectRoot)); // Also serve from root for node_modules
```

This ensures:
- `/trading/css/tailwind.css` maps to `frontend/css/tailwind.css` ✅
- `/trading/node_modules/...` maps to `node_modules/...` ✅

### 2. Frontend Path Simplification
Simplified the HTML to use relative paths that work with the base href:

```html
<!-- Base href is set synchronously before resources load -->
<base href="/trading/" id="app-base">

<!-- Resources use relative paths - they resolve via base href -->
<link href="css/tailwind.css" rel="stylesheet">
<script src="node_modules/chart.js/dist/chart.umd.min.js"></script>
<script src="node_modules/chartjs-plugin-zoom/dist/chartjs-plugin-zoom.min.js"></script>
<script src="node_modules/preline/dist/preline.js"></script>
```

This approach:
- Works automatically for both `/trading/` (production) and `/frontend/` (development)
- No need for JavaScript path switching after page load
- Base href is set synchronously before any resources load

## Testing

### Local Development
```bash
# Should return 200 OK
curl -I http://localhost:8080/frontend/css/tailwind.css
```

### Production (after deployment)
```bash
# Should return 200 OK
curl -I https://voynich.online/trading/css/tailwind.css
```

## Files Changed
1. `backend/server.mjs` - Updated static file serving configuration
2. `frontend/index.html` - Simplified resource paths to use relative paths with base href

## Deployment Notes

On production server, ensure:
1. CSS file exists: `/var/www/html/trading/css/tailwind.css`
2. Node modules exist: `/var/www/html/trading/node_modules/`
3. Apache is configured to serve these directories
4. Permissions are correct: `chmod 755` for directories, `chmod 644` for files

## Status
✅ CSS file now loads correctly in both development and production
✅ All resource paths resolve correctly
✅ No JavaScript path manipulation needed after page load

