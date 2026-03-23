#!/bin/bash
# CC7: Caddy SSL Setup Script
#
# This script:
# 1. Checks if Caddy is installed
# 2. Adds resendld.localhost to /etc/hosts
# 3. Trusts Caddy's internal CA (for self-signed certs)
# 4. Starts Caddy with the Caddyfile
#
# Usage:
#   bash scripts/caddy/setup-caddy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CADDYFILE="$SCRIPT_DIR/Caddyfile"
LOG_DIR="${HOME}/.local/bin/resendld/logs"

echo "🔧 Setting up Caddy for resendld..."

# 1. Check if Caddy is installed
if ! command -v caddy &> /dev/null; then
    echo "❌ Caddy not found. Install it first:"
    echo "   brew install caddy    # macOS"
    echo "   apt install caddy     # Debian/Ubuntu"
    echo "   dnf install caddy     # Fedora"
    exit 1
fi

echo "✓ Caddy found: $(which caddy)"
echo "  Version: $(caddy version | head -1)"

# 2. Add resendld.localhost to /etc/hosts if not present
HOSTS_ENTRY="127.0.0.1 resendld.localhost"
if ! grep -q "resendld.localhost" /etc/hosts; then
    echo ""
    echo "📝 Adding resendld.localhost to /etc/hosts (requires sudo)..."
    echo "$HOSTS_ENTRY" | sudo tee -a /etc/hosts > /dev/null
    echo "✓ Added to /etc/hosts"
else
    echo "✓ resendld.localhost already in /etc/hosts"
fi

# 3. Create log directory
mkdir -p "$LOG_DIR"
echo "✓ Log directory: $LOG_DIR"

# 4. Trust Caddy's internal CA
echo ""
echo "🔐 Trusting Caddy's internal CA (may prompt for password)..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sudo caddy trust 2>/dev/null || echo "  (CA may already be trusted)"
else
    # Linux
    caddy trust 2>/dev/null || echo "  (CA may already be trusted)"
fi
echo "✓ CA trusted"

# 5. Validate Caddyfile
echo ""
echo "📋 Validating Caddyfile..."
caddy validate --config "$CADDYFILE" 2>&1 || {
    echo "❌ Invalid Caddyfile"
    exit 1
}
echo "✓ Caddyfile valid"

# 6. Test the configuration
echo ""
echo "🚀 Starting Caddy..."
echo "   Config: $CADDYFILE"
echo ""

# Stop any existing Caddy process
caddy stop 2>/dev/null || true

# Start Caddy
caddy start --config "$CADDYFILE"

echo ""
echo "✅ Caddy is running!"
echo ""
echo "📌 Next steps:"
echo "   1. Start the web server:  cd web && bun run dev"
echo "   2. Visit:                 https://resendld.localhost"
echo ""
echo "📋 Commands:"
echo "   View logs:    tail -f $LOG_DIR/caddy.log"
echo "   Stop Caddy:   caddy stop"
echo "   Restart:      caddy reload --config $CADDYFILE"
