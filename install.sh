#!/usr/bin/env bash
# resendld installer

set -euo pipefail

echo "🚀 Installing resendld..."

# Create directories
mkdir -p ~/.local/bin/resendld/src/daemon
mkdir -p ~/.config/resendld
mkdir -p ~/.openclaw/workspace/mail/inbox

# Copy daemon files
cp -r src/daemon/* ~/.local/bin/resendld/src/daemon/
cp src/resendld.sh ~/.local/bin/resendld/resendld
chmod +x ~/.local/bin/resendld/resendld

# Install dependencies
cd ~/.local/bin/resendld
if command -v bun &> /dev/null; then
  bun install
else
  npm install
fi

# Build
bun build src/daemon/listen.ts --target bun --outfile listen.js 2>/dev/null || node_modules/.bin/esbuild src/daemon/listen.ts --bundle --platform=node --outfile=listen.js

# Create default config if not exists
if [[ ! -f ~/.config/resendld/boxes.json ]]; then
  cat > ~/.config/resendld/boxes.json << 'EOF'
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
  echo "✅ Created ~/.config/resendld/boxes.json (edit with your email)"
fi

echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Edit ~/.config/resendld/boxes.json with your email address"
echo "2. Run: ~/.local/bin/resendld/resendld start"
echo "3. Check: ~/.local/bin/resendld/resendld status"
