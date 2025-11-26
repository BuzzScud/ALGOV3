# Production Error Fix

## Issue
Error on production: "An error occurred trying to load the resource" at `voynich.online/trading/`

## Root Cause
The base href detection was running AFTER resources started loading, causing resources to load from wrong paths.

## Fix Applied
1. **Default base href to `/trading/`** (production path)
2. **Only change to `/frontend/` for localhost** (development)
3. **Use relative paths** that resolve via base href
4. **Synchronous detection** before resources load

## Files Changed
- `frontend/index.html` - Updated base href logic

## Deployment Checklist

After deploying this fix, verify on production server:

1. **CSS file exists:**
   ```bash
   ls -la /var/www/html/trading/css/tailwind.css
   ```

2. **Node modules exist:**
   ```bash
   ls -d /var/www/html/trading/node_modules/chart.js
   ls -d /var/www/html/trading/node_modules/chartjs-plugin-zoom
   ls -d /var/www/html/trading/node_modules/preline
   ```

3. **Check browser console** for 404 errors:
   - Open `https://voynich.online/trading/`
   - Press F12 → Console tab
   - Look for failed resource loads

4. **Verify base href:**
   - Should be `/trading/` on production
   - Resources should load from `/trading/css/...` and `/trading/node_modules/...`

## If Resources Still Fail to Load

The files may not be deployed correctly. Run on production server:

```bash
cd /var/www/html/trading

# Install dependencies if missing
npm install --production

# Build CSS if missing
npx tailwindcss -i ./input.css -o ./css/tailwind.css --minify

# Check permissions
sudo chown -R apache:apache /var/www/html/trading
sudo chmod -R 755 /var/www/html/trading
```

## Testing

### Local (should use /frontend/):
- URL: `http://localhost:8080/frontend/index.html`
- Base href: `/frontend/`
- Resources: `/frontend/css/...`, `/frontend/node_modules/...`

### Production (should use /trading/):
- URL: `https://voynich.online/trading/`
- Base href: `/trading/`
- Resources: `/trading/css/...`, `/trading/node_modules/...`

