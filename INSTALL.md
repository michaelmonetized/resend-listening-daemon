# Installation Guide

**Resend Listening Daemon** — Local-first email listening with real-time OpenClaw integration.

Tested on:
- ✅ **macOS** 12.0+ (Intel & Apple Silicon)
- ✅ **Arch Linux** (systemd)
- 🔧 Other Linux distros (manual dependency installation required)

---

## Quick Start

### 1. Prerequisites

**macOS:**
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Arch Linux:**
```bash
# Ensure pacman is up to date
sudo pacman -Sy
```

### 2. Install

```bash
cd ~/Projects/resend-listening-daemon
bash install.sh
```

The installer will:
- ✅ Detect your OS (macOS or Arch Linux)
- ✅ Install dependencies (bun, node, jq, caddy)
- ✅ Create directory structure at `~/.local/bin/resendld`
- ✅ Build TypeScript → JavaScript
- ✅ Create default config at `~/.config/resendld/boxes.json`
- ✅ Set up auto-start (systemd on Linux, launchd on macOS)

### 3. Configure

Edit `~/.config/resendld/boxes.json` with your email address(es):

```json
{
  "boxes": [
    {
      "email": "hello@mycompany.tld",
      "isActive": true,
      "lastSync": null
    },
    {
      "email": "support@mycompany.tld",
      "isActive": true,
      "lastSync": null
    }
  ]
}
```

### 4. Authenticate with Resend

```bash
# Install Resend CLI (if not already done)
npm install -g @resend/cli

# Login to your Resend account
resend auth login
```

### 5. Start the Daemon

**macOS (launchd):**
```bash
launchctl load ~/Library/LaunchAgents/com.resendld.daemon.plist
# Or restart your Mac for auto-load
```

**Arch Linux (systemd):**
```bash
systemctl --user enable resendld
systemctl --user start resendld
```

### 6. Access the Web UI

Open **https://resendld.localhost** in your browser.

On first visit, you may see an SSL certificate warning. This is expected (self-signed cert). Click "Advanced" → "Accept risk" to proceed.

---

## Directory Structure

```
~/.local/bin/resendld/          ← Installation root
├── src/
│   ├── resendld.sh             ← Main entry point
│   ├── daemon/
│   │   ├── listen.ts           ← Resend listening loop
│   │   ├── gateway.ts          ← OpenClaw integration
│   │   └── storage.ts          ← Local file storage
│   ├── cli/                    ← CLI commands
│   └── tui/                    ← Terminal UI (future)
├── web/                        ← Web UI (TanStack Start)
│   ├── src/
│   │   ├── routes/             ← Page routes
│   │   ├── components/         ← React components
│   │   └── hooks/              ← Custom hooks
│   ├── convex/                 ← Convex schema & queries
│   └── package.json
├── scripts/
│   ├── install.sh              ← Installation script
│   └── caddy/
│       └── Caddyfile           ← Reverse proxy config
├── config/
│   └── boxes.json.example
├── listen.js                   ← Compiled daemon
└── package.json

~/.config/resendld/
├── boxes.json                  ← Active email boxes

~/.openclaw/workspace/mail/
├── inbox/
│   └── sender-name/
│       └── subject-line-date-hash/
│           ├── MSG.md          ← Email (Markdown + YAML)
│           ├── index.json      ← Metadata
│           └── attachments/    ← Files
```

---

## Usage

### CLI Commands

```bash
# Box management
resendld box add user@example.com
resendld box list
resendld box remove user@example.com
resendld box toggle user@example.com

# Daemon control
resendld start      # Start daemon + web + Caddy
resendld stop       # Stop all services
resendld restart    # Restart services
resendld status     # Check service status
resendld logs       # View daemon logs

# Future: Message actions
resendld archive <messageId>
resendld delete <messageId>
resendld spam <messageId>
resendld reply <messageId> --to user@example.com --body "text"
```

### Web UI Features

- **Inbox** — View emails, sorted newest first
- **Search** — Full-text search across subject, body, from
- **Message Detail** — Read email, download attachments, see headers
- **Reply** — Compose and send replies
- **Archive** — Move to archive (non-destructive)
- **Labels** — Tag emails for organization
- **Sender Groups** — Browse by sender

---

## Troubleshooting

### "resendld: command not found"

The installer adds `~/.local/bin/resendld` to your PATH. Restart your terminal:

```bash
# For zsh
source ~/.zshrc

# For bash
source ~/.bashrc
```

Or manually add to your shell config:
```bash
export PATH="$HOME/.local/bin/resendld:$PATH"
```

### "Failed to connect to gateway"

Ensure OpenClaw gateway is running:

```bash
curl http://localhost:8000/health
```

Or set a custom gateway URL:
```bash
export OPENCLAW_GATEWAY_URL="http://192.168.1.100:8000"
resendld start
```

### "No emails appearing"

1. Check boxes are active in `~/.config/resendld/boxes.json`
2. Verify Resend CLI is authenticated:
   ```bash
   resend auth list
   ```
3. Check daemon logs:
   ```bash
   resendld logs
   ```
4. Test listening manually:
   ```bash
   resend emails receiving listen --to test@example.com
   ```

### "Web UI not loading"

1. Verify daemon is running:
   ```bash
   resendld status
   ```
2. Check Caddy is running:
   ```bash
   pgrep -i caddy
   # macOS: ps aux | grep caddy
   ```
3. Try direct access (no SSL):
   ```
   http://localhost:3000
   ```
4. Check daemon logs for errors:
   ```bash
   resendld logs
   ```

### "Caddy error: address in use"

Port 443 may be in use. Check what's running:

```bash
# macOS
sudo lsof -i :443

# Linux
sudo ss -tulpn | grep :443
```

Kill the conflicting process or configure a different port in `scripts/caddy/Caddyfile`.

### "SSL certificate warning persists"

The certificate is self-signed. To trust it permanently:

**macOS:**
```bash
# Trust the cert in Keychain
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain \
  ~/.local/bin/resendld/scripts/caddy/localhost.crt
```

**Linux:**
```bash
# Copy cert to system trust store
sudo cp ~/.local/bin/resendld/scripts/caddy/localhost.crt \
  /etc/ca-certificates/trust-source/anchors/
sudo trust extract-compat
```

### "Database is locked" (SQLite)

Multiple Convex dev servers running. Kill conflicts:

```bash
pkill -f "convex dev"
resendld restart
```

---

## Development

### Local Development (Not Installed)

```bash
cd ~/Projects/resend-listening-daemon

# Start Convex backend
npx convex dev

# In another terminal, start web server
cd web && bun run dev

# In another terminal, start daemon
bun src/daemon/listen.ts

# Web UI: http://localhost:3000
```

### Running Tests

```bash
cd ~/Projects/resend-listening-daemon/web
bun run type-check   # TypeScript check
bun run lint         # Lint code
bun run format       # Format code
bun run test         # Run tests (if available)
```

### Building for Production

```bash
cd ~/.local/bin/resendld
bun build src/daemon/listen.ts --target bun --outfile listen.js

cd web
bun run build
```

---

## Platform-Specific Notes

### macOS

- Daemon runs as a user agent via launchd (no root required)
- Logs: `~/.openclaw/workspace/logs/resendld.log`
- Auto-start after login
- Disable with: `launchctl unload ~/Library/LaunchAgents/com.resendld.daemon.plist`

### Arch Linux

- Daemon runs as a user service via systemd
- Logs: `journalctl --user -u resendld -f`
- Enable with: `systemctl --user enable resendld`
- Start/stop with: `systemctl --user start|stop|restart resendld`

---

## Upgrading

To pull the latest version and reinstall:

```bash
cd ~/Projects/resend-listening-daemon
git pull origin main
bash install.sh  # Re-run installer (safe, won't overwrite config)
```

---

## Security Considerations

- **Config file permissions:** `~/.config/resendld/boxes.json` stores email addresses. Keep permissions secure:
  ```bash
  chmod 600 ~/.config/resendld/boxes.json
  ```
- **Resend API tokens:** Stored in `~/.resend/config.json` by the CLI. Keep permissions secure:
  ```bash
  chmod 600 ~/.resend/config.json
  ```
- **Local storage:** Emails stored in `~/.openclaw/workspace/mail/` are unencrypted. Ensure your machine is secure.
- **SSL cert:** Self-signed, only trusted on your local machine. Don't share the cert.

---

## Uninstall

```bash
# Stop the daemon
resendld stop

# macOS: Unload launchd
launchctl unload ~/Library/LaunchAgents/com.resendld.daemon.plist

# Arch Linux: Disable systemd
systemctl --user disable resendld

# Remove installation
rm -rf ~/.local/bin/resendld
rm -rf ~/.config/resendld

# Optional: Remove data
rm -rf ~/.openclaw/workspace/mail/inbox
```

---

## Support

- **GitHub Issues:** Report bugs and request features
- **GitHub Discussions:** Ask questions and share ideas
- **Email:** Open an issue for support

---

**Last updated:** March 24, 2026
