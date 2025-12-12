#!/bin/bash

echo "🧪 Testing Server Layout Configuration"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if static HTML files are removed
echo "Test 1: Checking for static HTML files..."
if [ -f "public/index.html" ]; then
    echo -e "${RED}❌ FAIL: public/index.html still exists${NC}"
else
    echo -e "${GREEN}✅ PASS: public/index.html removed${NC}"
fi

if [ -f "public/layouts/master.html" ]; then
    echo -e "${RED}❌ FAIL: public/layouts/master.html still exists${NC}"
else
    echo -e "${GREEN}✅ PASS: public/layouts/master.html removed${NC}"
fi

echo ""

# Test 2: Check if EJS templates exist
echo "Test 2: Checking for EJS templates..."
if [ -f "views/layouts/master.ejs" ]; then
    echo -e "${GREEN}✅ PASS: views/layouts/master.ejs exists${NC}"
else
    echo -e "${RED}❌ FAIL: views/layouts/master.ejs not found${NC}"
fi

echo ""

# Test 3: Check if all partials exist
echo "Test 3: Checking for EJS partials..."
PARTIALS=(
    "views/partials/head-extra.ejs"
    "views/partials/sidebar.ejs"
    "views/partials/header.ejs"
    "views/partials/mobile-nav.ejs"
    "views/partials/modals.ejs"
    "views/partials/scripts.ejs"
    "views/partials/scripts-extra.ejs"
)

for partial in "${PARTIALS[@]}"; do
    if [ -f "$partial" ]; then
        echo -e "${GREEN}✅ PASS: $partial exists${NC}"
    else
        echo -e "${RED}❌ FAIL: $partial not found${NC}"
    fi
done

echo ""

# Test 4: Check if view helpers exist
echo "Test 4: Checking for view helpers..."
if [ -f "src/helpers/view.helper.js" ]; then
    echo -e "${GREEN}✅ PASS: src/helpers/view.helper.js exists${NC}"
else
    echo -e "${RED}❌ FAIL: src/helpers/view.helper.js not found${NC}"
fi

echo ""

# Test 5: Check if EJS is installed
echo "Test 5: Checking if EJS is installed..."
if grep -q '"ejs"' package.json; then
    echo -e "${GREEN}✅ PASS: EJS is in package.json${NC}"
else
    echo -e "${RED}❌ FAIL: EJS not found in package.json${NC}"
fi

echo ""

# Test 6: Check server configuration
echo "Test 6: Checking server configuration..."
if grep -q "app.set('view engine', 'ejs')" src/app.js; then
    echo -e "${GREEN}✅ PASS: EJS view engine configured${NC}"
else
    echo -e "${RED}❌ FAIL: EJS view engine not configured${NC}"
fi

if grep -q "registerHelpers" src/app.js; then
    echo -e "${GREEN}✅ PASS: View helpers registered${NC}"
else
    echo -e "${RED}❌ FAIL: View helpers not registered${NC}"
fi

if grep -q "res.render('layouts/master'" src/app.js; then
    echo -e "${GREEN}✅ PASS: Main route renders EJS${NC}"
else
    echo -e "${RED}❌ FAIL: Main route doesn't render EJS${NC}"
fi

echo ""
echo "======================================"
echo "🏁 Test Complete"
echo ""
echo -e "${YELLOW}To test the server:${NC}"
echo "1. npm start"
echo "2. Open http://localhost:3000"
echo "3. View page source (should see complete HTML)"
echo "4. Check console for: ✅ Rendering master layout with EJS"
