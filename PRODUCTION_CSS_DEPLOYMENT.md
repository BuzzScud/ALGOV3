# CSS File Deployment Instructions

## Issue
CSS file (`frontend/css/tailwind.css`) may be missing in production.

## Verification

The CSS file is:
- ✅ **37KB** in size
- ✅ **Tracked in Git**
- ✅ **Accessible locally** (HTTP 200)
- ✅ **Properly referenced** in HTML

## Production Deployment Steps

### Step 1: SSH to Production Server
```bash
ssh user@voynich.online
```

### Step 2: Navigate to Trading Directory
```bash
cd /var/www/html/trading
```

### Step 3: Pull Latest Code
```bash
git pull origin main
```

### Step 4: Verify CSS File Exists
```bash
ls -lh css/tailwind.css
# Should show: 37KB file
```

### Step 5: If File is Missing, Rebuild It
```bash
# Install dependencies if needed
npm install --production

# Build CSS file
npx tailwindcss -i ./input.css -o ./css/tailwind.css --minify

# Verify it was created
ls -lh css/tailwind.css
```

### Step 6: Set Correct Permissions
```bash
sudo chmod 644 css/tailwind.css
sudo chown apache:apache css/tailwind.css
```

### Step 7: Verify File is Accessible
```bash
curl -I https://voynich.online/trading/css/tailwind.css
# Should return: HTTP/1.1 200 OK
# Content-Type: text/css; charset=UTF-8
```

## File Location in Production

```
/var/www/html/trading/
├── index.html
├── css/
│   └── tailwind.css    ← This file must exist (37KB)
├── input.css
└── tailwind.config.js
```

## Troubleshooting

### File Returns 404
- Check if file exists: `ls -la css/tailwind.css`
- Check permissions: `stat css/tailwind.css`
- Rebuild CSS: `npx tailwindcss -i ./input.css -o ./css/tailwind.css --minify`

### File Returns Wrong Content-Type
- Server should set: `Content-Type: text/css; charset=UTF-8`
- Check Apache configuration for CSS files

### File is Empty or Corrupted
- Delete and rebuild: `rm css/tailwind.css && npx tailwindcss -i ./input.css -o ./css/tailwind.css --minify`

## Current Status

✅ File exists locally: `frontend/css/tailwind.css` (37KB)
✅ File is tracked in Git
✅ File is accessible via localhost
✅ Server configured with correct MIME types

**Action Required**: Deploy to production server
