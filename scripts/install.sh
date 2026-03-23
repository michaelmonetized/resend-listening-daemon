#!/bin/bash
# Install resendld to ~/.local/bin

set -euo pipefail

INSTALL_DIR="$HOME/.local/bin/resendld"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Installing resendld to $INSTALL_DIR..."

# Create directories
mkdir -p "$INSTALL_DIR"/{src,logs,state}

# Copy files
cp "$SOURCE_DIR/scripts/resendld-daemon.sh" "$INSTALL_DIR/resendld"
chmod +x "$INSTALL_DIR/resendld"

mkdir -p "$HOME/.config/resendld"
if [[ ! -f "$HOME/.config/resendld/boxes.json" ]]; then
  cat > "$HOME/.config/resendld/boxes.json" << 'EOF'
{
  "boxes": [
    {
      "email": "user@uncap.us",
      "isActive": true,
      "lastSync": null
    }
  ]
}
EOF
fi

# Build TypeScript
echo "Building TypeScript..."
cd "$SOURCE_DIR"
bun build src/daemon/listen.ts --target bun --outfile "$INSTALL_DIR/src/daemon/listen.js"

echo "✅ resendld installed to $INSTALL_DIR"
echo "Next steps:"
echo "  1. Add to your PATH: export PATH=\"\$HOME/.local/bin/resendld:\$PATH\""
echo "  2. Configure boxes: resendld box add your@email.com"
echo "  3. Set API key: export RESEND_API_KEY=re_xxxxx"
echo "  4. Start daemon: resendld start"
