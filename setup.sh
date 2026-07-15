#!/bin/bash
#
# Kiro Remote Bridge — Quick Setup
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/SunnyDavid144/kiro-remote-bridge/main/setup.sh | bash
#   or: ./setup.sh
#

set -e

echo ""
echo "  📱 Kiro Remote Bridge — Setup"
echo "  ─────────────────────────────────"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "  ❌ Node.js is required but not installed."
    echo "     Install it from: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "  ❌ Node.js 18+ required (you have $(node -v))"
    exit 1
fi
echo "  ✓ Node.js $(node -v)"

# Check macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "  ❌ macOS is required (AppleScript is used for IDE injection)"
    exit 1
fi
echo "  ✓ macOS detected"

# Clone or update
if [ -d "kiro-remote-bridge" ]; then
    echo "  ✓ Directory exists, pulling latest..."
    cd kiro-remote-bridge
    git pull --quiet
else
    echo "  ⏳ Cloning repository..."
    git clone --quiet https://github.com/SunnyDavid144/kiro-remote-bridge.git
    cd kiro-remote-bridge
fi

# Install dependencies
echo "  ⏳ Installing backend dependencies..."
cd backend && npm install --silent 2>/dev/null && cd ..

echo "  ⏳ Installing frontend dependencies..."
cd frontend && npm install --silent 2>/dev/null && cd ..

# Create bridge directory
mkdir -p .kiro-bridge

# Get local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "127.0.0.1")

echo ""
echo "  ✅ Setup complete!"
echo ""
echo "  ─────────────────────────────────"
echo "  To start the bridge:"
echo ""
echo "    cd kiro-remote-bridge/backend && npm start"
echo ""
echo "  To start the frontend:"
echo ""
echo "    cd kiro-remote-bridge/frontend && npm run dev -- -p 3101"
echo ""
echo "  Then open on your phone:"
echo ""
echo "    http://${LOCAL_IP}:3101"
echo ""
echo "  ─────────────────────────────────"
echo ""
echo "  ⚠️  Don't forget to grant Accessibility access:"
echo "     System Settings → Privacy & Security → Accessibility"
echo ""
echo "  For 5G/remote access, install Tailscale on Mac + phone."
echo ""
