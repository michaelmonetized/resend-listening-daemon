# Installation Guide

## Prerequisites

Before installing resendld, ensure you have:

- **Bun** (v1.1+) - JavaScript runtime
- **Node.js** (v20+) - Required for Convex
- **Caddy** (v2.7+) - Reverse proxy for HTTPS
- **resend-cli** - Resend's CLI tool (fork with receiving support)

### Install Prerequisites

```bash
# macOS
brew install bun caddy

# Linux (Debian/Ubuntu)
curl -fsSL https://bun.sh/install | bash
sudo apt install caddy
```

## Quick Install

```bash
# Clone the repository
git clone https://github.com/yourorg/resend-listening-daemon.git
cd resend-listening-daemon

# Run the install script
bash scripts/install.sh
```

The install script will:
1. Check all dependencies
2. Install to `~/.local/bin/resendld`
3. Set up the Convex backend
4. Configure Caddy for HTTPS
5. Create systemd/launchd service

## Manual Installation

### 1. Clone and Build

```bash
git clone https://github.com/yourorg/resend-listening-daemon.git
cd resend-listening-daemon

# Install daemon dependencies
bun install

# Install web dependencies
cd web
bun install
cd ..
```

### 2. Configure Boxes

Create your boxes configuration:

```bash
mkdir -p ~/.config/resendld
cat > ~/.config/resendld/boxes.json << 'EOF'
{
  "boxes": [
    {
      "email": "support@yourdomain.com",
      "isActive": true,
      "lastSync": null
    }
  ]
}
EOF
```

### 3. Set Up Caddy

```bash
# Add to /etc/hosts
echo "127.0.0.1 resendld.localhost" | sudo tee -a /etc/hosts

# Start Caddy
cd scripts/caddy
bash setup-caddy.sh
```

### 4. Start the Daemon

```bash
# Start the daemon
resendld start

# Check status
resendld status
```

### 5. Open Web UI

Visit [https://resendld.localhost](https://resendld.localhost) in your browser.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLAW_WORKSPACE` | `~/.openclaw/workspace` | Base directory for mail storage |
| `CONVEX_URL` | `http://localhost:3210` | Convex backend URL |
| `OPENCLAW_GATEWAY_URL` | `http://localhost:8000` | OpenClaw gateway URL |
| `XDG_CONFIG_HOME` | `~/.config` | Config directory |

## Troubleshooting

### Daemon won't start

```bash
# Check logs
resendld logs

# Check if port is in use
lsof -i :3000
lsof -i :3210
```

### Caddy SSL errors

```bash
# Trust the CA again
sudo caddy trust

# Check Caddy status
caddy validate --config scripts/caddy/Caddyfile
```

### Convex connection errors

```bash
# Start Convex dev server
cd web
npx convex dev
```

## Uninstall

```bash
# Stop the daemon
resendld stop

# Remove files
rm -rf ~/.local/bin/resendld
rm -rf ~/.config/resendld

# Remove Caddy config
caddy stop
```
