# Backend Files Required

## Essential Files for Backend Server

### 1. **Core Server File** (REQUIRED)
- `server.mjs` - Main Node.js server file with all API endpoints

### 2. **Package Configuration** (REQUIRED)
- `package.json` - Defines dependencies and scripts
- `package-lock.json` - Locks dependency versions (auto-generated, but recommended)

### 3. **PM2 Configuration** (REQUIRED for production)
- `ecosystem.config.js` - PM2 process manager configuration
  - Can be created on the server, or included in repo

### 4. **Dependencies** (Auto-installed via npm)
- `node_modules/` - All npm packages (installed via `npm install`)
  - **Critical dependency:** `undici` - Provides fetch polyfill
  - Other dependencies: express, cors, etc.

## Complete File List

### Minimum Required Files:
```
/var/www/voynich-backend/
├── server.mjs              ← Main server file (REQUIRED)
├── package.json            ← Dependencies list (REQUIRED)
├── package-lock.json       ← Dependency lock file (recommended)
├── ecosystem.config.js     ← PM2 config (can create on server)
└── node_modules/           ← Dependencies (installed via npm install)
    ├── undici/             ← CRITICAL: fetch polyfill
    ├── express/
    ├── cors/
    └── ... (other dependencies)
```

## What Gets Installed

When you run `npm install`, it installs these packages (from `package.json`):

```json
{
  "dependencies": {
    "@tailwindcss/forms": "^0.5.10",
    "chart.js": "^4.5.1",
    "chartjs-plugin-zoom": "^2.2.0",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "preline": "^3.2.3",
    "undici": "^7.16.0"    ← CRITICAL for fetch
  },
  "devDependencies": {
    "tailwindcss": "^3.4.18"
  }
}
```

## Files NOT Needed for Backend

These files are for the **frontend** only:
- `index.html` - Frontend HTML (served by Apache)
- `js/app.js` - Frontend JavaScript (served by Apache)
- `css/` - Frontend styles (served by Apache)
- `input.css` - Tailwind input (for frontend)

## Setup Process

### Step 1: Get Required Files
```bash
cd /var/www/voynich-backend

# Option A: Clone entire repo (gets all files)
git clone https://github.com/BuzzScud/ALGOV3.git .

# Option B: Just get backend files (if you want minimal)
# You still need: server.mjs, package.json, package-lock.json
```

### Step 2: Install Dependencies
```bash
npm install
# This creates node_modules/ with all required packages
```

### Step 3: Create PM2 Config (if not in repo)
```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'voynich-backend',
    script: 'server.mjs',
    cwd: '/var/www/voynich-backend',
    env: { NODE_ENV: 'production', PORT: 8080 },
    autorestart: true
  }]
};
EOF
```

## Verification

After setup, verify you have everything:

```bash
cd /var/www/voynich-backend

# Check required files exist
ls -la server.mjs package.json

# Check undici is installed
npm list undici

# Check all dependencies
npm list --depth=0
```

## Summary

**Minimum files needed:**
1. `server.mjs` - Main server code
2. `package.json` - Dependency definitions
3. `package-lock.json` - Dependency versions (recommended)
4. `node_modules/` - Installed via `npm install`
5. `ecosystem.config.js` - PM2 config (can create on server)

**That's it!** The backend only needs these files to run.

