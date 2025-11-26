#!/bin/bash
# Frontend Deployment Script for Production
# This script updates the frontend files in /var/www/html/trading/

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FRONTEND_TARGET_DIR="/var/www/html/trading"
FRONTEND_SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../frontend" && pwd)"

echo -e "${BLUE}=== Frontend Deployment Script ===${NC}"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -eq 0 ]; then
    ACTUAL_USER="${SUDO_USER:-$USER}"
else
    ACTUAL_USER="$USER"
fi

echo -e "${YELLOW}Source directory: ${FRONTEND_SOURCE_DIR}${NC}"
echo -e "${YELLOW}Target directory: ${FRONTEND_TARGET_DIR}${NC}"
echo ""

# Step 1: Check if target directory exists
if [ ! -d "$FRONTEND_TARGET_DIR" ]; then
    echo -e "${YELLOW}Creating target directory...${NC}"
    sudo mkdir -p "$FRONTEND_TARGET_DIR"
    sudo chown -R "$ACTUAL_USER:$ACTUAL_USER" "$FRONTEND_TARGET_DIR"
fi

# Step 2: Check if it's a git repository
cd "$FRONTEND_TARGET_DIR"
if [ -d ".git" ]; then
    echo -e "${YELLOW}Pulling latest code from git...${NC}"
    git pull origin main || {
        echo -e "${YELLOW}Git pull failed, trying fetch and reset...${NC}"
        git fetch origin main
        git reset --hard origin/main
    }
    echo -e "${GREEN}✓ Code updated from git${NC}"
else
    echo -e "${YELLOW}Not a git repository. Copying files...${NC}"
    
    # Copy frontend files
    echo "Copying frontend files..."
    sudo cp -r "$FRONTEND_SOURCE_DIR"/* "$FRONTEND_TARGET_DIR/" 2>/dev/null || {
        # If cp -r fails, try file by file
        sudo cp "$FRONTEND_SOURCE_DIR/index.html" "$FRONTEND_TARGET_DIR/" 2>/dev/null || true
        sudo mkdir -p "$FRONTEND_TARGET_DIR/css" "$FRONTEND_TARGET_DIR/js"
        sudo cp "$FRONTEND_SOURCE_DIR/css"/* "$FRONTEND_TARGET_DIR/css/" 2>/dev/null || true
        sudo cp "$FRONTEND_SOURCE_DIR/js"/* "$FRONTEND_TARGET_DIR/js/" 2>/dev/null || true
    }
    echo -e "${GREEN}✓ Files copied${NC}"
fi

# Step 3: Set correct permissions
echo ""
echo -e "${YELLOW}Setting file permissions...${NC}"
sudo chown -R apache:apache "$FRONTEND_TARGET_DIR" 2>/dev/null || \
sudo chown -R www-data:www-data "$FRONTEND_TARGET_DIR" 2>/dev/null || \
sudo chown -R "$ACTUAL_USER:$ACTUAL_USER" "$FRONTEND_TARGET_DIR"

sudo chmod -R 755 "$FRONTEND_TARGET_DIR"
echo -e "${GREEN}✓ Permissions set${NC}"

# Step 4: Verify critical files exist
echo ""
echo -e "${YELLOW}Verifying critical files...${NC}"
if [ -f "$FRONTEND_TARGET_DIR/index.html" ]; then
    echo -e "${GREEN}✓ index.html exists${NC}"
else
    echo -e "${RED}✗ index.html not found!${NC}"
    exit 1
fi

if [ -f "$FRONTEND_TARGET_DIR/css/tailwind.css" ]; then
    echo -e "${GREEN}✓ tailwind.css exists${NC}"
else
    echo -e "${YELLOW}⚠ tailwind.css not found - CSS may not load correctly${NC}"
fi

# Step 5: Check for base href in index.html
echo ""
echo -e "${YELLOW}Checking base href configuration...${NC}"
if grep -q 'base href="/frontend/"' "$FRONTEND_TARGET_DIR/index.html"; then
    echo -e "${GREEN}✓ Base href is configured correctly (/frontend/)${NC}"
elif grep -q 'base href="/trading/"' "$FRONTEND_TARGET_DIR/index.html"; then
    echo -e "${YELLOW}⚠ Base href is /trading/ - this is correct for Apache deployment${NC}"
else
    echo -e "${YELLOW}⚠ Base href not found - this may cause resource loading issues${NC}"
fi

echo ""
echo -e "${GREEN}=== Frontend Deployment Complete! ===${NC}"
echo ""
echo "Frontend files updated in: $FRONTEND_TARGET_DIR"
echo ""
echo "Next steps:"
echo "  1. Clear browser cache"
echo "  2. Test the website"
echo "  3. Check browser console for any errors"
echo ""


