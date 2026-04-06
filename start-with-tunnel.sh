#!/bin/bash
# Biblio Self-Hosted Server with Cloudflare Tunnel
# This script starts the app and creates a public HTTPS URL automatically

set -e

echo "📚 Biblio Self-Hosted Server with Cloudflare Tunnel"
echo "===================================================="

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo ""
    echo "❌ cloudflared is not installed!"
    echo ""
    echo "Please install it first:"
    echo "  Linux (Debian/Ubuntu):"
    echo "    wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
    echo "    sudo dpkg -i cloudflared-linux-amd64.deb"
    echo ""
    echo "  macOS:"
    echo "    brew install cloudflared"
    echo ""
    exit 1
fi

# Change to script directory
cd "$(dirname "$0")"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    cat > .env.local << EOF
LIBRARIAN_TELEGRAM_ID=1098880111
EOF
fi

# Show book count
BOOK_COUNT=$(sqlite3 public/biblio.db "SELECT COUNT(*) FROM books;" 2>/dev/null || echo "0")
echo "📖 Database: $BOOK_COUNT books"
echo ""

# Start the dev server in background
echo "🚀 Starting Next.js server..."
npm run dev > /tmp/biblio-dev.log 2>&1 &
DEV_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Server is ready!"
        break
    fi
    sleep 1
done

# Start Cloudflare Tunnel
echo ""
echo "🌐 Starting Cloudflare Tunnel..."
echo "   This will create a public HTTPS URL for your app"
echo ""

cloudflared tunnel --url http://localhost:3000

# Cleanup on exit
trap "kill $DEV_PID 2>/dev/null" EXIT
