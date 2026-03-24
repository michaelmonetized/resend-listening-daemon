# Installation Guide

**Resend Listening Daemon (resendld)** — Local-first email listening with real-time OpenClaw integration.

Tested on:
- **macOS** 12.0+ (Intel & Apple Silicon)
- **Arch Linux** (systemd, EndeavourOS, Artix)
- Other Linux distros: manual dependency installation required

---

## Quick Start

### 1. Prerequisites

**macOS:**
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Arch Linux:**
```bash
# Full system upgrade first (partial upgrades break things)
sudo pacman -Syu
```

### 2. Install

```bash
cd ~/Projects/resend-listening-daemon
bash install.sh
```

The installer will:
- Detect your OS and architecture (Intel/ARM64)
- Install missing dependencies (node, jq, caddy, bun)
- Copy files to `~/.local/bin/resendld`
- Build TypeScript and verify the output
- Create default config at `~/.config/resendld/boxes.json`
- Symlink `resendld` command to `~/.local/bin/resendld`
- Set up auto-start service (systemd or launchd)
- Add `~/.local/bin` to your PATH

**Installer flags:**
```bash
bash install.sh --dry-run    # Preview without making changes
bash install.sh --force      # Overwrite existing install without prompting
bash install.sh --uninstall  # Remove everything cleanly
bash install.sh --help       # Show usage
```

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
# Install Resend CLI
npm install -g @resend/cli

# Login to your account
resend auth login
```

### 5. Start the Daemon

**macOS (launchd):**
```bash
launchctl load ~/Library/LaunchAgents/com.resendld.daemon.plist
```

**Arch Linux (systemd):**
```bash
systemctl --user enable --now resendld
```

### 6. Verify

```bash
resendld status    # Should show "running"
resendld logs      # Check for errors
```

### 7. Access the Web UI

Open **https://resendld.localhost** in your browser.

---

## Configuration Reference

### boxes.json

Location: `~/.config/resendld/boxes.json`

| Field      | Type    | Description                                        |
|------------|---------|----------------------------------------------------|
| `email`    | string  | The email address to monitor via Resend API        |
| `isActive` | boolean | Whether this box is actively polled (`true`/`false`) |
| `lastSync` | string\|null | ISO 8601 timestamp of last successful sync, or `null` if never synced |

Multiple boxes are supported. Inactive boxes are skipped during polling.

### Environment Variables

| Variable               | Default                    | Description                          |
|------------------------|----------------------------|--------------------------------------|
| `RESEND_API_KEY`       | *(from credentials file)*  | Resend API key. Also read from `~/.config/resend/credentials.json` |
| `OPENCLAW_GATEWAY_URL` | `https://localhost:18789`  | OpenClaw gateway endpoint            |
| `OPENCLAW_HOOKS_TOKEN` | *(from hooks.json)*        | Auth token for `/hooks/agent`        |
| `XDG_CONFIG_HOME`      | `~/.config`                | Override config directory base       |
| `INSTALL_PREFIX`       | `~/.local/bin/resendld`    | Override install location            |

### File Locations

| Path | Purpose |
|------|---------|
| `~/.local/bin/resendld/` | Installation root (daemon, web UI, scripts) |
| `~/.local/bin/resendld` | Symlink to `src/resendld.sh` (the command) |
| `~/.config/resendld/boxes.json` | Active email box configuration |
| `~/.openclaw/workspace/mail/inbox/` | Downloaded emails (Markdown + attachments) |
| `~/.openclaw/workspace/logs/` | Daemon and service logs |
| `~/.local/bin/resendld/state/seen-ids.json` | Deduplication state (seen message IDs) |

---

## Directory Structure

```
~/.local/bin/resendld/              <- Installation root
├── src/
│   ├── resendld.sh                 <- Main CLI entry point
│   ├── daemon/
│   │   ├── listen.ts               <- Resend polling loop (pure fetch)
│   │   ├── gateway.ts              <- OpenClaw integration
│   │   ├── storage.ts              <- Local file storage
│   │   └── convex.ts               <- Convex backend integration
│   ├── cli/
│   │   ├── index.ts                <- CLI entry point
│   │   └── commands.ts             <- Box/message management
│   └── tui/                        <- Terminal UI (future)
├── web/                            <- Web UI (TanStack Start)
│   ├── src/routes/                 <- Page routes
│   ├── src/components/             <- React components
│   ├── convex/                     <- Convex schema & queries
│   └── package.json
├── scripts/
│   └── caddy/
│       └── Caddyfile               <- Reverse proxy config
├── config/
│   └── boxes.json.example
├── state/
│   └── seen-ids.json               <- Deduplication state
├── listen.js                       <- Compiled daemon
└── package.json

~/.config/resendld/
└── boxes.json                      <- Your email box config

~/.openclaw/workspace/mail/inbox/
└── sender-name/
    └── subject-line-date-hash/
        ├── MSG.md                  <- Email (YAML frontmatter + body)
        ├── index.json              <- Metadata
        └── attachments/            <- Downloaded files
```

---

## Usage

### CLI Commands

```bash
# Daemon control
resendld start          # Start daemon + web + Caddy
resendld stop           # Stop all services
resendld restart        # Restart services
resendld status         # Check service status
resendld logs           # View daemon logs

# Box management
resendld box add user@example.com
resendld box list
resendld box remove user@example.com
```

### Web UI Features

- **Inbox** — View emails, sorted newest first
- **Search** — Full-text search across subject, body, sender
- **Message Detail** — Read email, download attachments, view headers
- **Reply** — Compose and send replies via Resend
- **Archive** — Move to archive (non-destructive)
- **Labels** — Tag emails for organization

---

## Platform-Specific Notes

### macOS

- Daemon runs as a **user agent** via launchd (no root required)
- Logs: `~/.openclaw/workspace/logs/resendld.log`
- Auto-starts after login
- Apple Silicon Homebrew path (`/opt/homebrew/bin`) is included in the launchd environment
- Disable: `launchctl unload ~/Library/LaunchAgents/com.resendld.daemon.plist`

#### Trusting the Self-Signed SSL Certificate

The Web UI runs behind Caddy with a self-signed cert. To stop browser warnings permanently:

**Option A: Caddy's root CA (recommended)**
```bash
# Caddy stores its root CA here:
caddy trust
# This adds Caddy's CA to your system keychain. Restart your browser.
```

**Option B: Manual trust**
```bash
# Find the cert Caddy generated
CERT_PATH="$(caddy environ 2>/dev/null | grep -oP 'HOME=\K.*')/Library/Application Support/Caddy/pki/authorities/local/root.crt"

# If that doesn't work, check the common path:
CERT_PATH="$HOME/Library/Application Support/Caddy/pki/authorities/local/root.crt"

# Trust it system-wide
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain "$CERT_PATH"
```

**Option C: Chrome-specific**
1. Visit `https://resendld.localhost`
2. Click the lock icon -> "Certificate is not valid"
3. Drag the certificate icon to your Desktop
4. Double-click the `.cer` file -> opens Keychain Access
5. Find "Caddy Local Authority", double-click it
6. Expand "Trust" -> set "When using this certificate" to "Always Trust"

### Arch Linux

- Daemon runs as a **systemd user service** (no root for the service itself)
- Logs: `journalctl --user -u resendld -f`

#### systemd User Service vs System Service

The installer creates a **user** service (`~/.config/systemd/user/resendld.service`), not a system-wide one. This means:

- It runs as your user, not root
- It starts when you log in (not at boot)
- Managed with `systemctl --user` (not `sudo systemctl`)

**To run without an active login session** (e.g., headless server):
```bash
# Enable lingering for your user
sudo loginctl enable-linger $(whoami)

# Verify
loginctl show-user $(whoami) | grep Linger
# Should show: Linger=yes
```

**To start at boot instead** (system service):
```bash
# Copy the user service to system
sudo cp ~/.config/systemd/user/resendld.service /etc/systemd/system/

# Edit it: change paths from /home/you/... to absolute paths
sudo systemctl edit resendld.service

# Enable
sudo systemctl enable --now resendld
```

#### Trusting the Self-Signed SSL Certificate (Arch)

```bash
# Caddy trust command (easiest)
caddy trust

# Or manually:
sudo cp "$HOME/.local/share/caddy/pki/authorities/local/root.crt" \
  /etc/ca-certificates/trust-source/anchors/caddy-local.crt
sudo update-ca-trust
```

---

## Troubleshooting

### "resendld: command not found"

The installer symlinks `resendld` to `~/.local/bin/resendld`. Check:

```bash
# Is the symlink there?
ls -la ~/.local/bin/resendld

# Is ~/.local/bin in your PATH?
echo $PATH | tr ':' '\n' | grep local

# If not, add it:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc  # or ~/.bashrc
source ~/.zshrc
```

### "RESEND_API_KEY not found"

The daemon needs a Resend API key. It checks (in order):

1. `RESEND_API_KEY` environment variable
2. `~/.zshrc` (grep for `export RESEND_API_KEY=`)
3. `~/.config/resend/credentials.json` (from Resend CLI)

Fix:
```bash
# Option 1: Set in shell config
echo 'export RESEND_API_KEY="re_your_key_here"' >> ~/.zshrc
source ~/.zshrc

# Option 2: Use Resend CLI
npm install -g @resend/cli
resend auth login
```

### "Failed to connect to gateway"

The daemon dispatches emails to the OpenClaw gateway. If it's not running:

```bash
# Check if gateway is reachable
curl -k https://localhost:18789/health

# Or set a custom URL
export OPENCLAW_GATEWAY_URL="http://192.168.1.100:8000"
resendld restart
```

Gateway errors are non-fatal — emails still get stored locally and in Convex.

### "No emails appearing"

1. **Check boxes are active:**
   ```bash
   resendld box list
   # Or: cat ~/.config/resendld/boxes.json
   ```

2. **Verify Resend API key works:**
   ```bash
   curl -s -H "Authorization: Bearer $RESEND_API_KEY" \
     https://api.resend.com/emails/receiving | head -c 200
   ```

3. **Check daemon logs:**
   ```bash
   resendld logs
   # Or: journalctl --user -u resendld -f    (Arch)
   # Or: tail -f ~/.openclaw/workspace/logs/resendld.log  (macOS)
   ```

4. **Check deduplication state:**
   ```bash
   # If the daemon already saw the emails, they won't appear again
   cat ~/.local/bin/resendld/state/seen-ids.json
   # To reset: rm ~/.local/bin/resendld/state/seen-ids.json
   ```

### "Web UI not loading"

1. **Is the daemon running?**
   ```bash
   resendld status
   ```

2. **Is Caddy running?**
   ```bash
   pgrep caddy || echo "Caddy not running"
   ```

3. **Try direct access (no SSL):**
   ```
   http://localhost:3000
   ```

4. **Is port 443 in use?**
   ```bash
   # macOS
   sudo lsof -i :443
   # Linux
   sudo ss -tulpn | grep :443
   ```

### "Caddy error: address already in use"

Another process is using port 443 or 80:

```bash
# Find the culprit
sudo lsof -i :443  # macOS
sudo ss -tulpn | grep :443  # Linux

# Kill it or change the Caddyfile port
```

### "SSL certificate warning persists"

See the platform-specific SSL trust instructions above. The simplest fix:
```bash
caddy trust
# Then restart your browser
```

### "Database is locked" (SQLite/Convex)

Multiple Convex dev servers running:

```bash
pkill -f "convex dev"
resendld restart
```

### Build fails with "bun: not found"

bun is installed per-user at `~/.bun/bin/bun`. Ensure it's in PATH:

```bash
export PATH="$HOME/.bun/bin:$PATH"
# Or reinstall:
curl -fsSL https://bun.sh/install | bash
```

### systemd service won't start

```bash
# Check what went wrong
systemctl --user status resendld
journalctl --user -u resendld --no-pager -n 50

# Common fix: reload after editing
systemctl --user daemon-reload
systemctl --user restart resendld
```

---

## Upgrading

```bash
cd ~/Projects/resend-listening-daemon
git pull origin main
bash install.sh --force    # Re-install (config is preserved unless --force)
resendld restart
```

---

## Uninstall

### Quick Uninstall

```bash
bash install.sh --uninstall
```

This will:
- Stop the daemon
- Remove the launchd/systemd service
- Remove `~/.local/bin/resendld` (installation)
- Prompt to remove `~/.config/resendld` (config)
- Leave mail data intact at `~/.openclaw/workspace/mail/`

### Manual Uninstall

```bash
# 1. Stop the daemon
resendld stop

# 2. Remove service
# macOS:
launchctl unload ~/Library/LaunchAgents/com.resendld.daemon.plist
rm ~/Library/LaunchAgents/com.resendld.daemon.plist

# Arch Linux:
systemctl --user disable --now resendld
rm ~/.config/systemd/user/resendld.service
systemctl --user daemon-reload

# 3. Remove installation and symlink
rm -rf ~/.local/bin/resendld
rm -f ~/.local/bin/resendld

# 4. Remove config (optional)
rm -rf ~/.config/resendld

# 5. Remove mail data (optional, destructive!)
rm -rf ~/.openclaw/workspace/mail/inbox

# 6. Remove PATH line from ~/.zshrc or ~/.bashrc
# Delete the line: export PATH="$HOME/.local/bin:$PATH"

# 7. Remove logs (optional)
rm -rf ~/.openclaw/workspace/logs/resendld.*
```

---

## Security Considerations

- **Config permissions:** `boxes.json` is created with `chmod 600` (owner-only read/write)
- **API tokens:** Stored by Resend CLI at `~/.config/resend/credentials.json` — ensure `chmod 600`
- **Local email storage:** Emails at `~/.openclaw/workspace/mail/` are stored unencrypted. Secure your machine.
- **SSL cert:** Self-signed, only trusted on your machine. Never share Caddy's private key.
- **No network exposure:** The daemon only makes outbound requests. No ports are exposed to the network (Caddy binds to localhost only).

---

## Development

### Local Development (From Source)

```bash
cd ~/Projects/resend-listening-daemon

# Start Convex backend
npx convex dev

# In another terminal: web server
cd web && bun run dev

# In another terminal: daemon
bun src/daemon/listen.ts

# Web UI: http://localhost:3000
```

### Building for Production

```bash
cd ~/Projects/resend-listening-daemon
bun build src/daemon/listen.ts --target bun --outfile listen.js

cd web
bun run build
```

### Running Tests

```bash
cd ~/Projects/resend-listening-daemon/web
bun run type-check   # TypeScript check
bun run lint         # Lint code
bun run format       # Format code
```

---

## Support

- **GitHub Issues:** Report bugs and request features
- **GitHub Discussions:** Ask questions and share ideas
