# Resend Listening Daemon — Theo's Setup Guide

## Quick Start (Match Rusty's Setup)

### 1. Clone & Install
```bash
cd ~/Projects/resend-listening-daemon
bash scripts/install.sh
```

This will:
- Copy daemon to `~/.local/bin/resendld`
- Set up configuration directory
- Build TypeScript → JavaScript
- Create systemd/launchd service

### 2. Set Environment Variables
```bash
# Add to ~/.zshrc (or your shell profile)
export RESEND_API_KEY="re_xxxxx..."  # from Resend dashboard
export OPENCLAW_HOOKS_TOKEN="gw_xxxxx..."  # from OpenClaw gateway
export OPENCLAW_GATEWAY_URL="https://localhost:18789"  # or your gateway URL
```

Then reload:
```bash
source ~/.zshrc
```

### 3. Configure Resend Boxes
```bash
# Edit configuration
nano ~/.config/resendld/boxes.json
```

Example:
```json
{
  "boxes": [
    {
      "email": "theo@uncap.us",
      "isActive": true,
      "lastSync": null
    }
  ]
}
```

### 4. Start the Daemon
```bash
resendld start
```

This will start:
- ✅ **Listening loop** — Polls Resend API every 5 seconds for new emails
- ✅ **Convex dev** — Local database (`npx convex dev`)
- ✅ **Web server** — TanStack Start UI (`bun run start` → Vinxi)

### 5. Verify Status
```bash
resendld status
```

Should show: ✓ resendld is running (PID: XXXX)

### 6. Watch Logs
```bash
# Terminal 1: Daemon logs
tail -f ~/.local/bin/resendld/logs/daemon.log

# Terminal 2: Convex logs
tail -f ~/.local/bin/resendld/logs/convex.log

# Terminal 3: Web logs
tail -f ~/.local/bin/resendld/logs/web.log
```

### 7. Access Web UI
```
https://resendld.localhost
```

(If certificate issues: browser → Advanced → Accept risk)

---

## Troubleshooting

### Daemon Not Picking Up Emails
```bash
# Check daemon logs for "Body: X chars"
tail -f ~/.local/bin/resendld/logs/daemon.log | grep "Body:"
```

If shows `Body: 0 chars`:
1. Verify RESEND_API_KEY is valid
2. Check Resend dashboard for received emails
3. Test API directly:
   ```bash
   curl -H "Authorization: Bearer $RESEND_API_KEY" \
     https://api.resend.com/emails/receiving | jq '.data | length'
   ```

### Web Server Not Starting
```bash
# Check web logs
cat ~/.local/bin/resendld/logs/web.log | tail -50
```

Most common: deps not installed. Run manually:
```bash
cd ~/.local/bin/resendld/web
bun install
```

### Convex Not Running
```bash
# Check convex logs
cat ~/.local/bin/resendld/logs/convex.log | tail -50

# Verify Convex is installed
which npx
npx convex --version
```

### Emails Not Dispatching to OpenClaw
Check that OPENCLAW_HOOKS_TOKEN and OPENCLAW_GATEWAY_URL are set:
```bash
echo "Token: ${OPENCLAW_HOOKS_TOKEN:-(not set)}"
echo "URL: ${OPENCLAW_GATEWAY_URL:-(not set)}"
```

If missing, add to ~/.zshrc and reload.

---

## Key Differences from Rusty's Setup

✅ **Same as Rusty:**
- Listening loop (`listen.ts`) — polls Resend API
- Convex local deployment (`npx convex dev`)
- Web server (`bun run start`)
- Dispatch to OpenClaw hooks (`/hooks/agent`)
- File storage in `~/.openclaw/workspace/mail/inbox`

✅ **Newly Fixed:**
- Email body fallback — now captures HTML if text is empty
- Daemon script starts all 3 services (was commented out)
- Proper PID tracking for all processes
- Better error logging

---

## Next Steps After Setup Works

1. **Verify emails are being captured:**
   ```bash
   ls -la ~/.openclaw/workspace/mail/inbox/
   ```
   Should show folder structure: `sender@email/subject-date/MSG.md`

2. **Check email content:**
   ```bash
   cat ~/.openclaw/workspace/mail/inbox/*/*/MSG.md | head -50
   ```
   Should show frontmatter + body content

3. **Monitor OpenClaw:**
   Watch your OpenClaw session for agent tasks created from emails

---

**Status:** Ready to test. Run `resendld start` and send a test email.
