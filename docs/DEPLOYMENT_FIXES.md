# Deployment Fixes for Production Server

## Issues Fixed

1. ✅ **Backend "fetch is not defined" error** - Fixed fetch polyfill initialization
2. ✅ **Frontend "ctx is not defined" error** - Fixed canvas element scope issue
3. ⚠️ **node_modules 404 errors** - Requires server-side configuration

## Critical: node_modules 404 Errors

The browser is trying to load:
- `/trading/node_modules/preline/dist/preline.js`
- `/trading/node_modules/chart.js/dist/chart.umd.min.js`
- `/trading/node_modules/chartjs-plugin-zoom/dist/chartjs-plugin-zoom.min.js`

### Solution Options

#### Option 1: Serve node_modules via Apache (Recommended)

Since you're using Apache as a reverse proxy, have Apache serve the node_modules directly:

1. **Ensure node_modules exist on server:**
   ```bash
   cd /var/www/html/trading
   npm install
   ```

2. **Add to Apache vhost configuration** (`/etc/httpd/conf.d/httpd.conf.d-voynich.online.conf`):
   ```apache
   # Serve node_modules directly (before ProxyPass)
   Alias /trading/node_modules /var/www/html/trading/node_modules
   <Directory "/var/www/html/trading/node_modules">
     Options -Indexes
     AllowOverride None
     Require all granted
   </Directory>
   ```

3. **Restart Apache:**
   ```bash
   apachectl configtest
   systemctl restart httpd
   ```

#### Option 2: Use CDN (Alternative)

If node_modules are problematic, use CDN links in `index.html`:

```html
<!-- Replace node_modules scripts with CDN -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/preline@2.0.3/dist/preline.js"></script>
```

## Deployment Steps

1. **Pull latest code:**
   ```bash
   cd /var/www/html/trading
   git pull origin main
   ```

2. **Install dependencies (if needed):**
   ```bash
   npm install
   ```

3. **Restart Node.js backend:**
   ```bash
   pm2 restart voynich-backend
   pm2 logs voynich-backend  # Check for errors
   ```

4. **Configure Apache** (choose Option 1 or 2 above)

5. **Clear browser cache** and test:
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or use Incognito/Private mode

## Verification

After deployment, check:

1. **Backend is running:**
   ```bash
   pm2 status
   curl http://localhost:8080/api/health
   ```

2. **node_modules are accessible:**
   ```bash
   curl https://voynich.online/trading/node_modules/chart.js/dist/chart.umd.min.js
   # Should return JavaScript content, not 404
   ```

3. **Browser console** should show:
   - ✅ No 404 errors for node_modules
   - ✅ No "fetch is not defined" errors
   - ✅ No "ctx is not defined" errors
   - ✅ Chart initializes successfully

## Troubleshooting

If errors persist:

1. **Check server logs:**
   ```bash
   pm2 logs voynich-backend --lines 50
   tail -f /var/log/httpd/voynich.online-443-error.log
   ```

2. **Verify file permissions:**
   ```bash
   ls -la /var/www/html/trading/node_modules/chart.js/dist/chart.umd.min.js
   # Should be readable by Apache user
   ```

3. **Test direct access:**
   ```bash
   curl http://localhost:8080/trading/node_modules/chart.js/dist/chart.umd.min.js
   # If this works, Apache proxy might be the issue
   ```

