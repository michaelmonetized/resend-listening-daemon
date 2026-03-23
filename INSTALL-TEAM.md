# resendld Team Installation Guide

Install on multiple machines (intelpro, mpro13.local, m1pro) to listen to shared uncap.us email boxes.

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/michaelmonetized/resend-listening-daemon.git
cd resend-listening-daemon

# 2. Install
./install.sh

# 3. Configure your email box
# Edit ~/.config/resendld/boxes.json to add your email:
# - michael@uncap.us (Michael's box)
# - dhh@uncap.us (DHH's box)
# - theo@uncap.us (Theo's box)
# - support@uncap.us (Shared team box)

# 4. Start daemon
~/.local/bin/resendld/resendld start

# 5. Verify
~/.local/bin/resendld/resendld status
```

## Configuration

### boxes.json
Each machine should have its own `~/.config/resendld/boxes.json`:

**Michael's machine (m1pro):**
```json
{
  "boxes": [
    { "email": "michael@uncap.us", "isActive": true },
    { "email": "support@uncap.us", "isActive": true }
  ]
}
```

**DHH's machine (intelpro - Arch Linux):**
```json
{
  "boxes": [
    { "email": "dhh@uncap.us", "isActive": true },
    { "email": "support@uncap.us", "isActive": true }
  ]
}
```

**Theo's machine (mpro13.local - M1 Pro):**
```json
{
  "boxes": [
    { "email": "theo@uncap.us", "isActive": true },
    { "email": "support@uncap.us", "isActive": true }
  ]
}
```

## Email Delivery Flow

When an email arrives at any box:

1. **Daemon receives** (5-second polling from Resend)
2. **Stores locally** as markdown file in `~/.openclaw/workspace/mail/inbox/`
3. **Stores in Convex** backend (HTTP POST to :3210)
4. **Delivers to main session** via systemEvent (uses `openclaw cron add`)
5. **Notifies Telegram** (HurleyUS group)

## send-agent Integration

Each machine has `~/bin/send-agent` for sending prompts to OpenClaw main session:

```bash
send-agent "Deploy citation-manager to production"
send-agent "Run tests and report results"
```

This fires a systemEvent in your main OpenClaw session ~10 seconds later.

## Architecture

**Per-machine setup:**
- Daemon: `~/.local/bin/resendld/`
- Config: `~/.config/resendld/boxes.json`
- Logs: `~/.local/bin/resendld/logs/`
- CLI: `~/bin/send-agent`

**Shared infrastructure:**
- Resend API (uncap.us domain)
- Convex backend (localhost:3210)
- OpenClaw Gateway (main session routing)
- Telegram group (-1003740074376)

## Logs

Check daemon health:
```bash
tail -f ~/.local/bin/resendld/logs/daemon.log
```

Look for:
- `[C1]` — Email received
- `[CC1]` — Stored locally
- `[C3]` — Stored in Convex
- `[C4]` — Delivered to main session
- `[C2]` — Telegram notification

## Troubleshooting

**Daemon not starting:**
```bash
~/.local/bin/resendld/resendld start
# Check: ~/.local/bin/resendld/logs/daemon.log
```

**Emails not received:**
- Verify `~/.config/resendld/boxes.json` has correct emails
- Check Resend dashboard (uncap.us domain receiving enabled)
- Verify `~/.openclaw/workspace/mail/inbox/` exists

**systemEvent not firing:**
- Verify OpenClaw is running
- Check `openclaw cron list` for queued jobs
- Check `send-agent` works: `send-agent "test message"`

## Team Coordination

- **Michael** (m1pro): Listens to michael@uncap.us + support@uncap.us
- **DHH** (intelpro): Listens to dhh@uncap.us + support@uncap.us
- **Theo** (mpro13.local): Listens to theo@uncap.us + support@uncap.us

All machines receive emails sent to support@uncap.us simultaneously.

---

**GitHub:** https://github.com/michaelmonetized/resend-listening-daemon
**Latest:** `39211e3 fix: Deliver full email content directly to main session (non-blocking)`
