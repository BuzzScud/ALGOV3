# Apache Setup Verification - ALGOV3 Application

## ✅ Code Status: READY FOR APACHE PROXY

All frontend code has been updated to work with the Apache proxy configuration described in your setup guide.

---

## Frontend Code Verification

### ✅ `js/app.js` - ALL CHANGES COMPLETE

**Status:** ✅ **READY** - All localhost references removed, using relative URLs

**Verified Changes:**
- ✅ No `localhost:8080` or `localhost:8081` references found
- ✅ All API calls use relative URLs: `/api/quote`, `/api/history`, `/api/snapshot`, `/api/tetration-projection`
- ✅ `API_BASE` set to empty string: `const API_BASE = '';`
- ✅ FINNHUB_API_KEY commented out (security fix applied)
- ✅ No direct Finnhub API calls - all go through `/api/*` endpoints

**Example API Calls (All Using Relative URLs):**
```javascript
// Line 538: fetchMarketQuote
const url = `/api/quote/${symbol}?period=1d`;

// Line 1511: tetrationProjection - history
const histResp = await fetch(`/api/history?symbol=${encodeURIComponent(symbol)}&range=1mo&interval=1d`);

// Line 1531: tetrationProjection - tetration
const tetrationResp = await fetch(`/api/tetration-projection`, { ... });

// Line 1646: tetrationSnapshot - history
const histResp = await fetch(`/api/history?symbol=${encodeURIComponent(symbol)}&range=1mo&interval=1d`);

// Line 1666: tetrationSnapshot - snapshot
const snapResp = await fetch(`/api/snapshot`, { ... });
```

### ✅ `index.html` - ALL CHANGES COMPLETE

**Status:** ✅ **READY** - Using relative URLs with retry logic

**Verified Changes:**
- ✅ All API calls use relative URLs
- ✅ Added `fetchWithRetry()` function with exponential backoff
- ✅ Simplified API base URL configuration
- ✅ Fixed canvas element scope issues
- ✅ Enhanced error handling

---

## Backend Code Verification

### ✅ `server.mjs` - HEALTH ENDPOINT EXISTS

**Status:** ✅ **READY** - Health check endpoint configured

**Health Endpoint:**
```javascript
// Line 1506
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running!' });
});

// Also registered at /trading/api/health via registerApiRoute
```

**Test Command:**
```bash
curl http://localhost:8080/api/health
# Expected: {"status":"ok","message":"Server is running!"}
```

### ✅ API Routes Registered

All API routes are registered to work with both `/api/*` and `/trading/api/*` paths:
- `/api/health` ✅
- `/api/quote` ✅
- `/api/history` ✅
- `/api/snapshot` ✅
- `/api/tetration-projection` ✅

---

## Apache Configuration Requirements

Based on your setup guide, the Apache vhost needs these proxy directives:

```apache
# Proxy API requests to Node.js backend
ProxyPreserveHost On
ProxyPass /api http://localhost:8080/api
ProxyPassReverse /api http://localhost:8080/api
ProxyPass /trading/api http://localhost:8080/api
ProxyPassReverse /trading/api http://localhost:8080/api
ProxyTimeout 300
```

**Location:** Add these lines AFTER `<Directory "/var/www/html/trading">` section in:
`/etc/httpd/conf.d/httpd.conf.d-voynich.online.conf`

---

## Directory Structure Verification

**Expected Structure:**
```
/var/www/
├── html/
│   └── trading/              ← FRONTEND (served by Apache)
│       ├── index.html        ✅
│       ├── js/
│       │   └── app.js        ✅ (updated, ready)
│       ├── css/
│       └── ...
│
└── voynich-backend/          ← BACKEND (Node.js, PM2)
    ├── server.mjs            ✅
    ├── package.json          ✅
    └── node_modules/         ✅
```

---

## Pre-Deployment Checklist

### Server Admin Tasks:
- [ ] Node.js v20 installed (`node --version` should show v20.x.x)
- [ ] PM2 running with `voynich-backend` process
- [ ] Backend responds: `curl http://localhost:8080/api/health`
- [ ] Apache proxy configuration added to vhost
- [ ] SELinux configured: `setsebool -P httpd_can_network_connect 1`
- [ ] Apache config tested: `apachectl configtest`
- [ ] Apache restarted: `systemctl restart httpd`
- [ ] Proxy tested: `curl https://voynich.online/api/health`

### Developer Tasks:
- [x] ✅ `js/app.js` updated - all localhost URLs removed
- [x] ✅ `index.html` updated - using relative URLs
- [x] ✅ FINNHUB_API_KEY removed from frontend
- [x] ✅ All API calls use `/api/*` relative paths
- [x] ✅ Code committed and pushed to Git

---

## Testing After Deployment

### 1. Backend Health Check
```bash
# Direct backend
curl http://localhost:8080/api/health

# Through Apache proxy
curl https://voynich.online/api/health
curl https://voynich.online/trading/api/health
```

**Expected Response:**
```json
{"status":"ok","message":"Server is running!"}
```

### 2. Frontend Testing
1. Visit: `https://voynich.online/trading/`
2. Open Browser DevTools (F12) → Console tab
3. Check for errors:
   - ✅ NO "localhost" errors
   - ✅ NO CORS errors
   - ✅ NO 404 errors for `/api/*`
4. Test functionality:
   - Enter symbol: `AAPL`
   - Click "Generate Snapshot" or "Tetration Projection"
   - Verify chart loads with data

### 3. Network Tab Verification
- Open DevTools → Network tab
- Filter: XHR/Fetch
- Look for API calls:
  - ✅ `/api/quote?symbol=AAPL` - Status 200
  - ✅ `/api/history?symbol=AAPL&range=1mo&interval=1d` - Status 200
  - ✅ `/api/snapshot` or `/api/tetration-projection` - Status 200

---

## Troubleshooting

### If Backend Health Check Fails:
```bash
# Check PM2 status
pm2 status
pm2 logs voynich-backend

# Restart if needed
pm2 restart voynich-backend
```

### If Apache Proxy Fails:
```bash
# Check Apache error logs
tail -f /var/log/httpd/voynich.online-443-error.log

# Verify proxy configuration
grep -A 5 "ProxyPass" /etc/httpd/conf.d/httpd.conf.d-voynich.online.conf

# Test Apache config
apachectl configtest
```

### If Frontend Shows 404 for `/api/*`:
1. Verify Apache proxy is configured (see above)
2. Check SELinux: `getenforce` (should allow network connections)
3. Verify backend is running: `pm2 status`
4. Test proxy directly: `curl https://voynich.online/api/health`

### If CORS Errors Appear:
- Backend CORS is already configured in `server.mjs`
- If errors persist, check Apache is not stripping headers

---

## Summary

✅ **All frontend code is ready for Apache proxy deployment**

- `js/app.js`: ✅ Updated, no localhost references
- `index.html`: ✅ Updated, using relative URLs
- `server.mjs`: ✅ Health endpoint exists, CORS configured

**Next Steps:**
1. Server admin completes Apache proxy configuration
2. Test health endpoint through proxy
3. Deploy frontend code to `/var/www/html/trading/`
4. Clear browser cache and test

**All code changes have been committed and pushed to Git.**

