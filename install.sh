#!/usr/bin/env bash
# resendld installer - Cross-platform (macOS & Arch Linux)
# Installs to ~/.local/bin/resendld with web UI and systemd/launchd auto-start

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
  echo -e "${BLUE}ℹ${NC} $*"
}

success() {
  echo -e "${GREEN}✓${NC} $*"
}

warn() {
  echo -e "${YELLOW}⚠${NC} $*"
}

error() {
  echo -e "${RED}✗${NC} $*"
  exit 1
}

# Detect OS
detect_os() {
  local os_type
  os_type=$(uname -s)
  
  case "$os_type" in
    Darwin)
      echo "macos"
      ;;
    Linux)
      # Check for Arch
      if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$ID" == "arch" ]] || [[ "$ID" == "archlinux" ]]; then
          echo "arch"
        else
          echo "linux"
        fi
      else
        echo "linux"
      fi
      ;;
    *)
      error "Unsupported OS: $os_type"
      ;;
  esac
}

# Install dependencies based on OS
install_dependencies() {
  local os="$1"
  log "Installing dependencies for $os..."
  
  case "$os" in
    macos)
      # Check if brew is installed
      if ! command -v brew &> /dev/null; then
        error "Homebrew not found. Please install Homebrew first: https://brew.sh"
      fi
      
      log "Updating Homebrew..."
      brew update || warn "Homebrew update failed, continuing..."
      
      log "Installing required tools..."
      brew install -q bun node jq caddy || {
        warn "Some packages already installed, continuing..."
      }
      ;;
      
    arch)
      # Check if pacman is available
      if ! command -v pacman &> /dev/null; then
        error "pacman not found. This script requires Arch Linux."
      fi
      
      log "Installing required tools..."
      sudo pacman -Sy --noconfirm base-devel bun node jq caddy || {
        warn "Some packages may have failed, attempting yay..."
        if command -v yay &> /dev/null; then
          yay -S --noconfirm bun node jq caddy || warn "yay install failed, continuing..."
        fi
      }
      ;;
      
    linux)
      error "This installer is optimized for macOS and Arch Linux. For other Linux distributions, please install dependencies manually: bun, node, jq, caddy"
      ;;
  esac
  
  # Verify critical tools are installed
  for tool in node jq; do
    if ! command -v "$tool" &> /dev/null; then
      error "$tool is required but not installed"
    fi
  done
  
  # bun is optional, npm can work as fallback
  if ! command -v bun &> /dev/null && ! command -v npm &> /dev/null; then
    error "Neither bun nor npm found. Please install Node.js"
  fi
  
  success "Dependencies installed"
}

# Create directory structure
create_directories() {
  log "Creating directory structure..."
  
  local install_path="$HOME/.local/bin/resendld"
  local config_path="$HOME/.config/resendld"
  local mail_path="$HOME/.openclaw/workspace/mail/inbox"
  
  mkdir -p "$install_path"/{src/daemon,web,scripts,config,docs}
  mkdir -p "$config_path"
  mkdir -p "$mail_path"
  
  success "Directories created at:"
  echo "  • Install: $install_path"
  echo "  • Config: $config_path"
  echo "  • Mail: $mail_path"
}

# Copy project files
copy_project_files() {
  log "Copying project files..."
  
  local install_path="$HOME/.local/bin/resendld"
  local src_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  
  # Copy all project files, excluding .git and node_modules
  rsync -av --exclude='.git' \
            --exclude='node_modules' \
            --exclude='.next' \
            --exclude='dist' \
            --exclude='.env.local' \
            "$src_dir/" "$install_path/" || {
    error "Failed to copy project files. Is rsync installed?"
  }
  
  # Make scripts executable
  chmod +x "$install_path"/src/resendld.sh 2>/dev/null || true
  chmod +x "$install_path"/scripts/*.sh 2>/dev/null || true
  
  success "Project files copied to ~/.local/bin/resendld"
}

# Build TypeScript
build_typescript() {
  log "Building TypeScript..."
  
  local install_path="$HOME/.local/bin/resendld"
  cd "$install_path"
  
  if command -v bun &> /dev/null; then
    log "Using bun for build..."
    bun install || error "bun install failed"
    bun build src/daemon/listen.ts --target bun --outfile listen.js || {
      error "bun build failed"
    }
    success "Built with bun"
  elif command -v npm &> /dev/null; then
    log "Using npm for build (bun not available)..."
    npm install || error "npm install failed"
    
    # Try esbuild if available
    if command -v npx &> /dev/null; then
      npx esbuild src/daemon/listen.ts --bundle --platform=node --outfile=listen.js || {
        warn "esbuild failed, trying tsc..."
        npx tsc src/daemon/listen.ts --outDir . --module commonjs || {
          error "TypeScript build failed"
        }
      }
    fi
    
    success "Built with npm"
  else
    error "Neither bun nor npm available for build"
  fi
}

# Create default config
create_default_config() {
  log "Creating default configuration..."
  
  local config_file="$HOME/.config/resendld/boxes.json"
  
  if [ ! -f "$config_file" ]; then
    mkdir -p "$(dirname "$config_file")"
    cat > "$config_file" << 'EOF'
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
    success "Created $config_file (edit with your email address)"
  else
    warn "$config_file already exists, skipping"
  fi
}

# Set up systemd service (Linux)
setup_systemd() {
  local os="$1"
  
  if [[ "$os" != "arch" ]]; then
    return
  fi
  
  log "Setting up systemd service..."
  
  local install_path="$HOME/.local/bin/resendld"
  local service_file="$HOME/.config/systemd/user/resendld.service"
  
  mkdir -p "$(dirname "$service_file")"
  
  cat > "$service_file" << EOF
[Unit]
Description=Resend Listening Daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=$install_path/src/resendld.sh start
ExecStop=$install_path/src/resendld.sh stop
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="PATH=$install_path:\$PATH"

[Install]
WantedBy=default.target
EOF
  
  chmod 644 "$service_file"
  systemctl --user daemon-reload || true
  
  success "Systemd service installed at $service_file"
  echo "  Enable with: systemctl --user enable resendld"
  echo "  Start with: systemctl --user start resendld"
}

# Set up launchd service (macOS)
setup_launchd() {
  local os="$1"
  
  if [[ "$os" != "macos" ]]; then
    return
  fi
  
  log "Setting up launchd service..."
  
  local install_path="$HOME/.local/bin/resendld"
  local plist_file="$HOME/Library/LaunchAgents/com.resendld.daemon.plist"
  
  mkdir -p "$(dirname "$plist_file")"
  
  cat > "$plist_file" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.resendld.daemon</string>
  
  <key>ProgramArguments</key>
  <array>
    <string>$install_path/src/resendld.sh</string>
    <string>start</string>
  </array>
  
  <key>RunAtLoad</key>
  <true/>
  
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  
  <key>StandardOutPath</key>
  <string>$HOME/.openclaw/workspace/logs/resendld.log</string>
  
  <key>StandardErrorPath</key>
  <string>$HOME/.openclaw/workspace/logs/resendld.err</string>
  
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$install_path:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>
EOF
  
  chmod 644 "$plist_file"
  
  success "Launchd plist installed at $plist_file"
  echo "  Load with: launchctl load $plist_file"
  echo "  Unload with: launchctl unload $plist_file"
}

# Setup PATH
setup_path() {
  log "Checking PATH configuration..."
  
  local install_path="$HOME/.local/bin/resendld"
  local shell_config=""
  
  # Detect shell
  if [ -n "${ZSH_VERSION:-}" ]; then
    shell_config="$HOME/.zshrc"
  elif [ -n "${BASH_VERSION:-}" ]; then
    shell_config="$HOME/.bashrc"
  fi
  
  if [ -z "$shell_config" ]; then
    warn "Could not detect shell config. Please add $install_path to your PATH manually."
    return
  fi
  
  # Add to PATH if not already there
  if ! grep -q "$install_path" "$shell_config" 2>/dev/null; then
    cat >> "$shell_config" << EOF

# resendld
export PATH="\$HOME/.local/bin/resendld:\$PATH"
EOF
    success "Added ~/.local/bin/resendld to $shell_config"
    warn "Run: source $shell_config (or restart your terminal)"
  else
    success "PATH already configured in $shell_config"
  fi
}

# Main installation flow
main() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}🚀 Resend Listening Daemon Installer${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  local os
  os=$(detect_os)
  log "Detected OS: $os"
  echo ""
  
  install_dependencies "$os"
  echo ""
  
  create_directories
  echo ""
  
  copy_project_files
  echo ""
  
  build_typescript
  echo ""
  
  create_default_config
  echo ""
  
  # Platform-specific setup
  if [[ "$os" == "arch" ]]; then
    setup_systemd "$os"
  elif [[ "$os" == "macos" ]]; then
    setup_launchd "$os"
  fi
  echo ""
  
  setup_path
  echo ""
  
  # Final instructions
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}✓ Installation Complete!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "📍 Installation paths:"
  echo "  • Daemon: $HOME/.local/bin/resendld"
  echo "  • Config: $HOME/.config/resendld/boxes.json"
  echo "  • Mail: $HOME/.openclaw/workspace/mail/inbox"
  echo ""
  echo "🔧 Next steps:"
  echo "  1. Edit ~/.config/resendld/boxes.json with your email address(es)"
  echo "  2. Restart your terminal (or run: source ~/.zshrc)"
  echo ""
  
  if [[ "$os" == "arch" ]]; then
    echo "  3. Enable service: systemctl --user enable resendld"
    echo "  4. Start service: systemctl --user start resendld"
  elif [[ "$os" == "macos" ]]; then
    echo "  3. Load service: launchctl load ~/Library/LaunchAgents/com.resendld.daemon.plist"
    echo "  4. Or restart your Mac for auto-load"
  fi
  
  echo ""
  echo "✨ View logs:"
  if [[ "$os" == "arch" ]]; then
    echo "  • systemctl --user status resendld"
    echo "  • journalctl --user -u resendld -f"
  elif [[ "$os" == "macos" ]]; then
    echo "  • tail -f ~/.openclaw/workspace/logs/resendld.log"
  fi
  echo ""
  echo "🌐 Web UI: https://resendld.localhost"
  echo "   (Trust the SSL certificate on first visit)"
  echo ""
}

# Run main
main "$@"
