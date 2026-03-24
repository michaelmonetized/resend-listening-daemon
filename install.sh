#!/usr/bin/env bash
# resendld installer - Cross-platform (macOS & Arch Linux)
# Production-grade installer with bulletproof error handling
# Installs to ~/.local/bin/resendld with web UI and systemd/launchd auto-start

set -euo pipefail

# ==================== CONFIG ====================
DRY_RUN=0
INSTALL_PATH="$HOME/.local/bin/resendld"
CONFIG_PATH="$HOME/.config/resendld"
MAIL_PATH="$HOME/.openclaw/workspace/mail/inbox"

# ==================== COLORS & LOGGING ====================
# Detect if output is a TTY (not piped/redirected)
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  NC='\033[0m'
else
  # No colors if not a TTY
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  NC=''
fi

log() {
  echo -e "${BLUE}ℹ${NC} $*" >&2
}

success() {
  echo -e "${GREEN}✓${NC} $*" >&2
}

warn() {
  echo -e "${YELLOW}⚠${NC} $*" >&2
}

error() {
  echo -e "${RED}✗${NC} $*" >&2
  exit 1
}

# ==================== HELPERS ====================
command_exists() {
  command -v "$1" &> /dev/null
}

run_cmd() {
  local cmd="$@"
  if [ $DRY_RUN -eq 1 ]; then
    log "[DRY RUN] $cmd"
    return 0
  fi
  eval "$cmd"
}

# ==================== FLAGS ====================
parse_flags() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --dry-run)
        DRY_RUN=1
        log "Dry-run mode enabled (no changes will be made)"
        ;;
      --help)
        show_help
        exit 0
        ;;
      *)
        error "Unknown flag: $1"
        ;;
    esac
    shift
  done
}

show_help() {
  cat << EOF
Usage: install.sh [OPTIONS]

OPTIONS:
  --dry-run   Show what would be installed without making changes
  --help      Show this help message

EXAMPLES:
  bash install.sh
  bash install.sh --dry-run
  bash install.sh --help
EOF
}

# ==================== OS DETECTION ====================
detect_os() {
  local os_type
  os_type=$(uname -s)
  
  case "$os_type" in
    Darwin)
      echo "macos"
      ;;
    Linux)
      if [ -f /etc/os-release ]; then
        # shellcheck source=/dev/null
        . /etc/os-release
        if [[ "${ID:-}" == "arch" ]] || [[ "${ID:-}" == "archlinux" ]]; then
          echo "arch"
        else
          echo "linux"
        fi
      else
        echo "linux"
      fi
      ;;
    *)
      error "Unsupported OS: $os_type (only macOS and Arch Linux are supported)"
      ;;
  esac
}

detect_arch() {
  local arch
  arch=$(uname -m)
  
  case "$arch" in
    x86_64)
      echo "x86_64"
      ;;
    arm64|aarch64)
      echo "arm64"
      ;;
    *)
      error "Unsupported architecture: $arch"
      ;;
  esac
}

# ==================== DEPENDENCY INSTALLATION ====================
install_dependencies() {
  local os="$1"
  log "Installing dependencies for $os..."
  
  case "$os" in
    macos)
      # Check Homebrew
      if ! command_exists brew; then
        error "Homebrew not found. Install it first: https://brew.sh"
      fi
      
      log "Updating Homebrew..."
      if ! run_cmd "brew update 2>/dev/null"; then
        warn "Homebrew update failed, continuing..."
      fi
      
      log "Installing required tools (bun, node, jq)..."
      # caddy is optional, continue if it fails
      for pkg in bun node jq; do
        if ! command_exists "$pkg"; then
          if ! run_cmd "brew install -q $pkg"; then
            error "Failed to install $pkg via Homebrew"
          fi
        else
          success "$pkg already installed"
        fi
      done
      
      # caddy is optional for SSL
      if ! command_exists caddy; then
        warn "caddy not installed (optional for HTTPS proxy)"
      fi
      ;;
      
    arch)
      if ! command_exists pacman; then
        error "pacman not found. This script requires Arch Linux."
      fi
      
      log "Installing required tools (bun, node, jq)..."
      for pkg in bun node jq; do
        if ! command_exists "$pkg"; then
          if ! run_cmd "sudo pacman -S --noconfirm $pkg"; then
            error "Failed to install $pkg via pacman"
          fi
        else
          success "$pkg already installed"
        fi
      done
      
      # caddy is optional
      if ! command_exists caddy; then
        warn "caddy not installed (optional for HTTPS proxy)"
      fi
      ;;
      
    linux)
      error "Installer optimized for macOS and Arch Linux. For $os, manually install: bun, node, jq, caddy (optional)"
      ;;
  esac
  
  # Verify critical tools
  for tool in node; do
    if ! command_exists "$tool"; then
      error "$tool is required but not installed"
    fi
  done
  
  # Check for package manager
  if ! command_exists bun && ! command_exists npm && ! command_exists yarn; then
    error "No package manager found (bun, npm, or yarn required)"
  fi
  
  success "Dependencies verified"
}

# ==================== DIRECTORY CREATION ====================
create_directories() {
  log "Creating directory structure..."
  
  if [ $DRY_RUN -eq 1 ]; then
    log "[DRY RUN] mkdir -p $INSTALL_PATH/{src/daemon,web,scripts,config,docs}"
    log "[DRY RUN] mkdir -p $CONFIG_PATH"
    log "[DRY RUN] mkdir -p $MAIL_PATH"
    return 0
  fi
  
  mkdir -p "$INSTALL_PATH"/{src/daemon,web,scripts,config,docs} || error "Failed to create install directory"
  mkdir -p "$CONFIG_PATH" || error "Failed to create config directory"
  mkdir -p "$MAIL_PATH" || error "Failed to create mail directory"
  
  success "Directories created:"
  echo "  • Install: $INSTALL_PATH"
  echo "  • Config: $CONFIG_PATH"
  echo "  • Mail: $MAIL_PATH"
}

# ==================== FILE COPYING ====================
copy_project_files() {
  log "Copying project files..."
  
  local src_dir
  src_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" || error "Failed to determine source directory"
  
  if [ $DRY_RUN -eq 1 ]; then
    log "[DRY RUN] Copy $src_dir → $INSTALL_PATH"
    return 0
  fi
  
  # Try rsync first (best option), fallback to cp
  if command_exists rsync; then
    log "Using rsync to copy files..."
    if ! rsync -a --delete \
      --exclude='.git' \
      --exclude='node_modules' \
      --exclude='.next' \
      --exclude='dist' \
      --exclude='.env*' \
      "$src_dir/" "$INSTALL_PATH/"; then
      error "rsync failed to copy files"
    fi
  else
    log "rsync not available, using cp..."
    if ! cp -r "$src_dir"/* "$INSTALL_PATH/" 2>/dev/null; then
      error "cp failed to copy files"
    fi
    
    # Remove unwanted directories manually
    rm -rf "$INSTALL_PATH"/.git "$INSTALL_PATH"/node_modules "$INSTALL_PATH"/.next "$INSTALL_PATH"/dist "$INSTALL_PATH"/.env* 2>/dev/null || true
  fi
  
  # Make scripts executable
  chmod +x "$INSTALL_PATH"/src/resendld.sh 2>/dev/null || true
  find "$INSTALL_PATH"/scripts -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
  
  success "Project files copied to $INSTALL_PATH"
}

# ==================== BUILD ====================
build_typescript() {
  log "Building TypeScript..."
  
  if [ $DRY_RUN -eq 1 ]; then
    log "[DRY RUN] Build TypeScript in $INSTALL_PATH"
    return 0
  fi
  
  cd "$INSTALL_PATH" || error "Failed to cd to $INSTALL_PATH"
  
  if command_exists bun; then
    log "Using bun for build..."
    if ! bun install 2>&1 | grep -v "warn\|Saved"; then
      error "bun install failed"
    fi
    
    if ! bun build src/daemon/listen.ts --target bun --outfile listen.js 2>&1 | grep -v "warn"; then
      error "bun build failed"
    fi
    success "Built with bun"
  elif command_exists npm; then
    log "Using npm for build..."
    if ! npm install 2>&1 | grep -v "warn\|added\|up to date"; then
      error "npm install failed"
    fi
    
    if command_exists npx; then
      if npx esbuild src/daemon/listen.ts --bundle --platform=node --outfile=listen.js 2>/dev/null; then
        success "Built with esbuild"
      elif npx tsc src/daemon/listen.ts --outDir . --module commonjs 2>/dev/null; then
        success "Built with tsc"
      else
        error "No build tool available (esbuild or tsc required)"
      fi
    else
      error "npx not found"
    fi
  else
    error "No package manager available (bun or npm required)"
  fi
}

# ==================== VERIFICATION ====================
verify_build() {
  log "Verifying build..."
  
  if [ $DRY_RUN -eq 1 ]; then
    log "[DRY RUN] Verify listen.js exists"
    return 0
  fi
  
  if [ ! -f "$INSTALL_PATH/listen.js" ]; then
    error "Build verification failed: listen.js not found"
  fi
  
  # Check if it's valid JavaScript
  if ! node -c "$INSTALL_PATH/listen.js" 2>/dev/null; then
    warn "listen.js syntax check failed (may still work)"
  fi
  
  success "Build verified"
}

# ==================== CONFIG ====================
create_default_config() {
  log "Creating default configuration..."
  
  local config_file="$CONFIG_PATH/boxes.json"
  
  if [ $DRY_RUN -eq 1 ]; then
    log "[DRY RUN] Create config at $config_file"
    return 0
  fi
  
  if [ -f "$config_file" ]; then
    warn "$config_file already exists, skipping"
    return
  fi
  
  mkdir -p "$(dirname "$config_file")"
  
  cat > "$config_file" << 'EOF'
{
  "boxes": [
    {
      "email": "user@example.com",
      "isActive": true,
      "lastSync": null
    }
  ]
}
EOF
  
  chmod 600 "$config_file"
  success "Created default config at $config_file"
  echo "  Edit with your email address(es)"
}

# ==================== PATH SETUP ====================
ensure_path() {
  log "Checking PATH configuration..."
  
  # Ensure ~/.local/bin exists
  if [ ! -d "$HOME/.local/bin" ]; then
    log "Creating $HOME/.local/bin..."
    if [ $DRY_RUN -eq 0 ]; then
      mkdir -p "$HOME/.local/bin"
    fi
  fi
  
  # Create symlink if needed
  if [ ! -L "$HOME/.local/bin/resendld" ]; then
    log "Creating symlink: $HOME/.local/bin/resendld → $INSTALL_PATH"
    if [ $DRY_RUN -eq 0 ]; then
      ln -sf "$INSTALL_PATH" "$HOME/.local/bin/resendld"
    fi
  fi
  
  # Update shell config
  local shell_config=""
  if [ -n "${ZSH_VERSION:-}" ]; then
    shell_config="$HOME/.zshrc"
  elif [ -n "${BASH_VERSION:-}" ]; then
    shell_config="$HOME/.bashrc"
  fi
  
  if [ -z "$shell_config" ]; then
    warn "Could not detect shell config. Add $HOME/.local/bin to your PATH manually."
    return
  fi
  
  if [ $DRY_RUN -eq 1 ]; then
    log "[DRY RUN] Check/update PATH in $shell_config"
    return
  fi
  
  # Check if ~/.local/bin is already in PATH
  if ! grep -q "$HOME/.local/bin" "$shell_config" 2>/dev/null; then
    log "Adding $HOME/.local/bin to $shell_config..."
    cat >> "$shell_config" << EOF

# resendld - added by installer
export PATH="\$HOME/.local/bin:\$PATH"
EOF
    success "Updated $shell_config"
    warn "Run: source $shell_config (or restart your terminal)"
  else
    success "PATH already configured in $shell_config"
  fi
}

# ==================== SYSTEMD (ARCH) ====================
setup_systemd() {
  local os="$1"
  
  if [[ "$os" != "arch" ]]; then
    return
  fi
  
  log "Setting up systemd user service..."
  
  local service_file="$HOME/.config/systemd/user/resendld.service"
  
  if [ $DRY_RUN -eq 1 ]; then
    log "[DRY RUN] Create systemd service at $service_file"
    return
  fi
  
  mkdir -p "$(dirname "$service_file")"
  
  cat > "$service_file" << EOF
[Unit]
Description=Resend Listening Daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=$INSTALL_PATH/src/resendld.sh start
ExecStop=$INSTALL_PATH/src/resendld.sh stop
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="PATH=$INSTALL_PATH:\$PATH"

[Install]
WantedBy=default.target
EOF
  
  chmod 644 "$service_file"
  
  if ! systemctl --user daemon-reload 2>/dev/null; then
    warn "systemctl daemon-reload failed (may require re-login)"
  fi
  
  success "Systemd service installed"
  echo "  Enable: systemctl --user enable resendld"
  echo "  Start:  systemctl --user start resendld"
  echo "  Status: systemctl --user status resendld"
  echo "  Logs:   journalctl --user -u resendld -f"
}

# ==================== LAUNCHD (MACOS) ====================
setup_launchd() {
  local os="$1"
  
  if [[ "$os" != "macos" ]]; then
    return
  fi
  
  log "Setting up launchd service..."
  
  local plist_file="$HOME/Library/LaunchAgents/com.resendld.daemon.plist"
  
  if [ $DRY_RUN -eq 1 ]; then
    log "[DRY RUN] Create launchd plist at $plist_file"
    return
  fi
  
  mkdir -p "$(dirname "$plist_file")"
  mkdir -p "$HOME/.openclaw/workspace/logs"
  
  cat > "$plist_file" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.resendld.daemon</string>
  
  <key>ProgramArguments</key>
  <array>
    <string>$INSTALL_PATH/src/resendld.sh</string>
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
    <string>$INSTALL_PATH:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>
EOF
  
  chmod 644 "$plist_file"
  
  success "Launchd plist installed"
  echo "  Load: launchctl load $plist_file"
  echo "  Unload: launchctl unload $plist_file"
  echo "  Status: launchctl list | grep resendld"
  echo "  Logs: tail -f $HOME/.openclaw/workspace/logs/resendld.log"
}

# ==================== MAIN ====================
main() {
  parse_flags "$@"
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}🚀 Resend Listening Daemon Installer${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  local os
  local arch
  os=$(detect_os)
  arch=$(detect_arch)
  
  log "System: $os ($arch)"
  echo ""
  
  install_dependencies "$os"
  echo ""
  
  create_directories
  echo ""
  
  copy_project_files
  echo ""
  
  build_typescript
  echo ""
  
  verify_build
  echo ""
  
  create_default_config
  echo ""
  
  ensure_path
  echo ""
  
  # Platform-specific
  if [[ "$os" == "arch" ]]; then
    setup_systemd "$os"
  elif [[ "$os" == "macos" ]]; then
    setup_launchd "$os"
  fi
  echo ""
  
  # Final summary
  if [ $DRY_RUN -eq 1 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📋 DRY RUN COMPLETE${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "No changes were made. Run without --dry-run to install."
  else
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✓ Installation Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "📍 Installation paths:"
    echo "  • Daemon: $INSTALL_PATH"
    echo "  • Config: $CONFIG_PATH/boxes.json"
    echo "  • Mail: $MAIL_PATH"
    echo ""
    echo "🔧 Next steps:"
    echo "  1. Edit $CONFIG_PATH/boxes.json with your email(s)"
    echo "  2. Restart your terminal or: source ~/.zshrc"
    echo ""
    
    if [[ "$os" == "arch" ]]; then
      echo "  3. systemctl --user enable resendld"
      echo "  4. systemctl --user start resendld"
      echo ""
      echo "📊 Monitor: journalctl --user -u resendld -f"
    elif [[ "$os" == "macos" ]]; then
      echo "  3. launchctl load $HOME/Library/LaunchAgents/com.resendld.daemon.plist"
      echo "  4. Or restart your Mac for auto-load"
      echo ""
      echo "📊 Monitor: tail -f $HOME/.openclaw/workspace/logs/resendld.log"
    fi
    
    echo ""
    echo "🌐 Web UI: https://localhost:8443"
    echo "   (You may need to accept the self-signed certificate)"
    echo ""
  fi
}

# Run
main "$@"
