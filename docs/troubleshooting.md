# Troubleshooting

## Common Issues

### Daemon Issues

#### Daemon won't start

**Symptoms:** `resendld start` hangs or fails immediately.

**Check:**
```bash
# View detailed logs
resendld logs

# Check if something is using the port
lsof -i :3210

# Verify Convex is running
curl http://localhost:3210/version
```

**Solutions:**
- Kill any process using port 3210
- Start Convex manually: `cd web && npx convex dev`
- Check for syntax errors in boxes.json

#### No emails being received

**Symptoms:** Emails sent to your address don't appear.

**Check:**
```bash
# Verify daemon is running
resendld status

# Check active boxes
resendld box list

# Test Resend connection
resend emails receiving listen --to yourbox@domain.com
```

**Solutions:**
- Verify your Resend account has inbound email enabled
- Check that the domain is verified in Resend
- Ensure the box email matches exactly

#### High CPU usage

**Symptoms:** Daemon using 100% CPU.

**Solutions:**
- Check for infinite loops in listen.ts output
- Reduce number of active boxes
- Restart the daemon

### Web UI Issues

#### Page won't load

**Symptoms:** Browser shows connection error or blank page.

**Check:**
```bash
# Verify web server is running
curl http://localhost:3000

# Check Caddy status
caddy list
caddy validate --config scripts/caddy/Caddyfile

# Check browser console for errors
```

**Solutions:**
- Start the web server: `cd web && bun run dev`
- Restart Caddy: `caddy reload --config scripts/caddy/Caddyfile`
- Clear browser cache

#### SSL Certificate Warning

**Symptoms:** Browser warns about untrusted certificate.

**Solutions:**
```bash
# Trust Caddy's CA (requires sudo)
sudo caddy trust

# Restart browser after trusting
# If still failing, manually trust the CA:
# macOS: Keychain Access → System → Import Certificate
# Linux: Add to /etc/ssl/certs/
```

#### Messages not updating

**Symptoms:** New emails don't appear without refresh.

**Check:**
```bash
# Verify Convex WebSocket connection
# Browser DevTools → Network → WS tab

# Check Convex logs
cd web && npx convex logs
```

**Solutions:**
- Refresh the page
- Check if browser blocked WebSocket
- Restart Convex dev server

### Convex Issues

#### Connection refused

**Symptoms:** Error about Convex connection.

**Solutions:**
```bash
# Start Convex dev server
cd web
npx convex dev

# Or check if it's running
lsof -i :3210
```

#### Schema migration errors

**Symptoms:** Errors about missing fields or tables.

**Solutions:**
```bash
cd web

# Reset the database (development only!)
npx convex dev --reset

# Or push schema changes
npx convex deploy
```

### Storage Issues

#### Attachments not downloading

**Symptoms:** Attachments show but can't be downloaded.

**Check:**
```bash
# Verify file exists
ls ~/.openclaw/workspace/mail/inbox/*/*/attachments/

# Check file permissions
ls -la ~/.openclaw/workspace/mail/inbox/*/*/attachments/
```

**Solutions:**
- Ensure the attachment path is correct in MSG.md
- Check if Caddy is serving the files correctly
- Verify file permissions allow reading

#### Disk space full

**Symptoms:** New emails fail to save.

**Solutions:**
```bash
# Check disk usage
du -sh ~/.openclaw/workspace/mail/inbox/

# Clean up old emails
find ~/.openclaw/workspace/mail/inbox -type d -mtime +30 -exec rm -rf {} \;
```

### CLI Issues

#### Commands not found

**Symptoms:** `resendld: command not found`

**Solutions:**
```bash
# Add to PATH
export PATH="$HOME/.local/bin/resendld:$PATH"

# Add to your shell profile
echo 'export PATH="$HOME/.local/bin/resendld:$PATH"' >> ~/.zshrc
```

#### Permission denied

**Symptoms:** Error when running commands.

**Solutions:**
```bash
# Make scripts executable
chmod +x ~/.local/bin/resendld/resendld
chmod +x ~/.local/bin/resendld/*.sh
```

## Getting Help

### Log Files

| Log | Location |
|-----|----------|
| Daemon | `~/.local/bin/resendld/logs/daemon.log` |
| Caddy | `~/.local/bin/resendld/logs/caddy.log` |
| Convex | Terminal output from `npx convex dev` |

### Debug Mode

```bash
# Run daemon with verbose logging
DEBUG=* resendld start

# Run with trace
TRACE=1 resendld start
```

### Reporting Issues

When reporting issues, include:
1. Output of `resendld status`
2. Last 50 lines of daemon logs
3. Browser console errors (if UI issue)
4. Steps to reproduce

## Reset Everything

If all else fails, you can reset:

```bash
# Stop everything
resendld stop
caddy stop

# Remove data (WARNING: deletes all emails!)
rm -rf ~/.openclaw/workspace/mail/inbox/*
rm -rf ~/.local/bin/resendld/

# Reset Convex
cd web && npx convex dev --reset

# Reinstall
bash scripts/install.sh
```
