#!/usr/bin/env bash
# resendld installer

set -euo pipefail

echo "🚀 Installing resendld..."

# Create directories
mkdir -p ~/.local/bin/resendld/src/daemon
mkdir -p ~/.config/resendld
mkdir -p ~/.openclaw/workspace/mail/inbox

# Copy all project files
cp -r . ~/.local/bin/resendld/
cd ~/.local/bin/resendld
chmod +x src/resendld.sh
# Create symlink if needed
[[ -f src/resendld.sh ]] && ln -sf src/resendld.sh resendld || true

# Install dependencies
if command -v bun &> /dev/null; then
  echo "Installing with bun..."
  bun install
  bun build src/daemon/listen.ts --target bun --outfile listen.js
elif command -v npm &> /dev/null; then
  echo "Installing with npm..."
  npm install
  npx esbuild src/daemon/listen.ts --bundle --platform=node --outfile=listen.js
else
  echo "❌ Neither bun nor npm found. Please install one."
  exit 1
fi

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
