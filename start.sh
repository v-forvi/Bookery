#!/bin/bash
# Biblio Self-Hosted Server Startup Script

set -e

echo "📚 Starting Biblio Self-Hosted Server..."
echo "=========================================="

# Change to script directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env.local exists, if not create from example
if [ ! -f ".env.local" ]; then
    echo "⚠️  No .env.local found. Creating minimal config..."
    cat > .env.local << EOF
# Librarian Telegram ID (get from @userinfobot)
LIBRARIAN_TELEGRAM_ID=1098880111
EOF
fi

# Check if database exists in public folder
if [ ! -f "public/biblio.db" ]; then
    echo "❌ Error: public/biblio.db not found!"
    echo "   Please ensure your database file exists."
    exit 1
fi

# Show book count
BOOK_COUNT=$(sqlite3 public/biblio.db "SELECT COUNT(*) FROM books;" 2>/dev/null || echo "0")
echo "📖 Database contains $BOOK_COUNT books"

# Get local IP address
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
echo "🌐 Local IP: $LOCAL_IP"
echo "🔗 Local URL: http://localhost:3000"

# Start the server
echo ""
echo "🚀 Starting server..."
echo "   Press Ctrl+C to stop"
echo ""

npm run dev
