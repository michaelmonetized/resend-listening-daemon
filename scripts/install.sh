#!/bin/bash
set -euo pipefail

# Resendld Phase 0 Installation Script
# Installs daemon, compiles TypeScript, creates systemd/launchd service

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_PREFIX="${INSTALL_PREFIX:-$HOME/.local/bin/resendld}"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/resendld"
CONVEX_DIR="$INSTALL_PREFIX/web"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Resendld Phase 0 Installation ===${NC}"
echo ""

# Check dependencies
echo -e "${YELLOW}[1/5] Checking dependencies...${NC}"

MISSING_DEPS=()

if ! command -v bun &> /dev/null; then
  MISSING_DEPS+=("bun")
fi

if ! command -v node &> /dev/null; then
  MISSING_DEPS+=("node")
fi

if ! command -v jq &> /dev/null; then
  MISSING_DEPS+=("jq")
fi

if ! command -v caddy &> /dev/null; then
  MISSING_DEPS+=("caddy")
fi

if ! command -v resend &> /dev/null; then
  MISSING_DEPS+=("resend-cli")
fi

if [[ ${#MISSING_DEPS[@]} -gt 0 ]]; then
  echo -e "${RED}✗ Missing dependencies: ${MISSING_DEPS[*]}${NC}"
  echo ""
  echo "Install them via Homebrew (macOS):"
  echo "  brew install bun node jq caddy"
  echo "  npm install -g @resend/cli"
  echo ""
  echo "Or via your package manager (Linux):"
  echo "  # Debian/Ubuntu"
  echo "  sudo apt-get install node npm jq caddy"
  echo "  npm install -g @resend/cli"
  exit 1
fi

echo -e "${GREEN}✓ All dependencies installed${NC}"

# Create directories
echo -e "${YELLOW}[2/5] Creating directories...${NC}"

mkdir -p "$INSTALL_PREFIX"
mkdir -p "$INSTALL_PREFIX/src/daemon"
mkdir -p "$INSTALL_PREFIX/src/cli"
mkdir -p "$INSTALL_PREFIX/src/tui"
mkdir -p "$INSTALL_PREFIX/logs"
mkdir -p "$CONFIG_DIR"
mkdir -p "$INSTALL_PREFIX/web"

echo -e "${GREEN}✓ Directories created${NC}"

# Copy daemon files
echo -e "${YELLOW}[3/5] Copying daemon files...${NC}"

cp "$PROJECT_ROOT/src/resendld.sh" "$INSTALL_PREFIX/resendld"
chmod +x "$INSTALL_PREFIX/resendld"

cp "$PROJECT_ROOT/src/daemon/listen.ts" "$INSTALL_PREFIX/src/daemon/"
cp "$PROJECT_ROOT/src/daemon/gateway.ts" "$INSTALL_PREFIX/src/daemon/"
cp "$PROJECT_ROOT/src/daemon/storage.ts" "$INSTALL_PREFIX/src/daemon/"

echo -e "${GREEN}✓ Daemon files copied${NC}"

# Compile TypeScript
echo -e "${YELLOW}[4/5] Compiling TypeScript...${NC}"

cd "$INSTALL_PREFIX"

if command -v bun &> /dev/null; then
  echo "  Using bun to build..."
  bun build "$INSTALL_PREFIX/src/daemon/listen.ts" --outfile "$INSTALL_PREFIX/src/daemon/listen.js"
  bun build "$INSTALL_PREFIX/src/daemon/gateway.ts" --outfile "$INSTALL_PREFIX/src/daemon/gateway.js"
  bun build "$INSTALL_PREFIX/src/daemon/storage.ts" --outfile "$INSTALL_PREFIX/src/daemon/storage.js"
else
  echo "  Skipping compilation (bun required for full build)"
fi

echo -e "${GREEN}✓ TypeScript compiled${NC}"

# Setup web app
echo -e "${YELLOW}[4.5/5] Setting up web app...${NC}"

cp -r "$PROJECT_ROOT/web" "$INSTALL_PREFIX/web"

cd "$INSTALL_PREFIX/web"

if command -v bun &> /dev/null; then
  echo "  Installing dependencies with bun..."
  bun install
else
  echo "  Installing dependencies with npm..."
  npm install
fi

echo -e "${GREEN}✓ Web app configured${NC}"

# Create systemd/launchd service
echo -e "${YELLOW}[5/5] Creating service...${NC}"

if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS: Create launchd plist
  LAUNCHD_DIR="$HOME/Library/LaunchAgents"
  PLIST_FILE="$LAUNCHD_DIR/com.resendld.daemon.plist"

  mkdir -p "$LAUNCHD_DIR"

  cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.resendld.daemon</string>
  <key>ProgramArguments</key>
  <array>
    <string>$INSTALL_PREFIX/resendld</string>
    <string>start</string>
  </array>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>StandardOutPath</key>
  <string>$INSTALL_PREFIX/logs/launchd.log</string>
  <key>StandardErrorPath</key>
  <string>$INSTALL_PREFIX/logs/launchd-error.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$INSTALL_PREFIX/bin</string>
    <key>OPENCLAW_WORKSPACE</key>
    <string>$HOME/.openclaw/workspace</string>
  </dict>
</dict>
</plist>
EOF

  echo "  Created launchd service: $PLIST_FILE"
  echo ""
  echo "  To start resendld on login:"
  echo "    launchctl load $PLIST_FILE"
  echo ""
  echo "  To stop:"
  echo "    launchctl unload $PLIST_FILE"

else
  # Linux: Create systemd unit
  SYSTEMD_DIR="$HOME/.config/systemd/user"
  SERVICE_FILE="$SYSTEMD_DIR/resendld.service"

  mkdir -p "$SYSTEMD_DIR"

  cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Resend Listening Daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=$INSTALL_PREFIX/resendld start
ExecStop=$INSTALL_PREFIX/resendld stop
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$INSTALL_PREFIX/bin"
Environment="OPENCLAW_WORKSPACE=$HOME/.openclaw/workspace"

[Install]
WantedBy=default.target
EOF

  echo "  Created systemd service: $SERVICE_FILE"
  echo ""
  echo "  To start resendld:"
  echo "    systemctl --user enable resendld"
  echo "    systemctl --user start resendld"
  echo ""
  echo "  To stop:"
  echo "    systemctl --user stop resendld"

fi

echo -e "${GREEN}✓ Service created${NC}"

# Initialize config
echo ""
echo -e "${YELLOW}Initializing configuration...${NC}"

if [[ ! -f "$CONFIG_DIR/boxes.json" ]]; then
  cat > "$CONFIG_DIR/boxes.json" << 'EOF'
{
  "boxes": [
    {
      "email": "user@domain.tld",
      "isActive": true,
      "lastSync": null
    }
  ]
}
EOF
  echo -e "${GREEN}✓ Created $CONFIG_DIR/boxes.json${NC}"
  echo ""
  echo "  Edit this file to add your Resend email boxes:"
  echo "    nano $CONFIG_DIR/boxes.json"
else
  echo -e "${GREEN}✓ Config already exists at $CONFIG_DIR/boxes.json${NC}"
fi

# Add to PATH
echo ""
echo -e "${YELLOW}Adding to PATH...${NC}"

if [[ ":$PATH:" == *":$INSTALL_PREFIX:"* ]]; then
  echo -e "${GREEN}✓ $INSTALL_PREFIX already in PATH${NC}"
else
  echo ""
  echo "  Add this to your shell config (~/.zshrc, ~/.bashrc, etc):"
  echo "    export PATH=\"$INSTALL_PREFIX:\$PATH\""
fi

# Summary
echo ""
echo -e "${GREEN}=== Installation Complete ===${NC}"
echo ""
echo "Configuration:"
echo "  Config file:     $CONFIG_DIR/boxes.json"
echo "  Install prefix:  $INSTALL_PREFIX"
echo "  Mail storage:    $HOME/.openclaw/workspace/mail/inbox"
echo "  Logs:            $INSTALL_PREFIX/logs"
echo ""
echo "Next steps:"
echo "  1. Edit $CONFIG_DIR/boxes.json"
echo "  2. Add your Resend email boxes"
echo "  3. Run: resendld start"
echo "  4. Open: https://resendld.localhost"
echo ""
echo "Test installation:"
echo "  resendld status"
echo ""
