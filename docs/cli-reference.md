# CLI Reference

## Overview

The `resendld` CLI provides commands to manage the email daemon, configure boxes, and interact with messages.

## Daemon Commands

### Start Daemon

```bash
resendld start
```

Starts the email listening daemon. The daemon will:
- Read configured boxes from `~/.config/resendld/boxes.json`
- Spawn listeners for each active box
- Store incoming emails locally
- Deliver notifications to OpenClaw gateway

### Stop Daemon

```bash
resendld stop
```

Stops the running daemon process.

### Restart Daemon

```bash
resendld restart
```

Restarts the daemon (stop + start).

### Check Status

```bash
resendld status
```

Shows the current daemon status:
- Running/stopped
- Active listeners
- Recent errors
- Memory usage

### View Logs

```bash
resendld logs
resendld logs -f        # Follow (like tail -f)
resendld logs -n 100    # Last 100 lines
```

## Box Management

### Add Box

```bash
resendld box add EMAIL

# Examples
resendld box add support@myapp.com
resendld box add billing@company.io
```

Adds an email box to monitor. The daemon will start listening for emails on this address.

### List Boxes

```bash
resendld box list
```

Shows all configured boxes with their status:

```
📮 Configured Email Boxes

  ● Email                    Status   Last Sync
─────────────────────────────────────────────────
  ● support@myapp.com        Active   Today
  ○ billing@company.io       Inactive Never

2 box(es) configured
```

### Remove Box

```bash
resendld box remove EMAIL

# Example
resendld box remove billing@company.io
```

Removes an email box from the configuration. Messages are not deleted.

## Message Actions

### Archive Message

```bash
resendld archive MESSAGE_ID

# Example
resendld archive msg_1234567890
```

Archives a message. Archived messages don't appear in the inbox but are not deleted.

### Delete Message

```bash
resendld delete MESSAGE_ID

# Example
resendld delete msg_1234567890
```

Permanently deletes a message and its attachments.

### Mark as Spam

```bash
resendld spam MESSAGE_ID

# Example
resendld spam msg_1234567890
```

Marks a message as spam. Spam messages are hidden from the inbox.

### Reply to Message

```bash
resendld reply MESSAGE_ID --to ADDR --body "text"

# Example
resendld reply msg_1234567890 --to user@example.com --body "Thanks for your email!"
```

Sends a reply to a message. The reply is sent via the Resend API.

## Terminal UI

### Launch TUI

```bash
resendld tui
```

Opens the interactive terminal UI for browsing emails.

**Controls:**
- `↑↓` - Navigate messages
- `Enter` - Open message
- `a` - Archive
- `d` - Delete
- `s` - Mark as spam
- `r` - Refresh / Reply (in detail view)
- `q` - Quit

## Options

### Help

```bash
resendld --help
resendld -h
```

Shows the help message with all available commands.

### Version

```bash
resendld --version
resendld -v
```

Shows the current version.

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Daemon not running |
| 4 | Connection error |

## Configuration Files

| Path | Description |
|------|-------------|
| `~/.config/resendld/boxes.json` | Box configuration |
| `~/.local/bin/resendld/` | Installation directory |
| `~/.local/bin/resendld/logs/` | Log files |
| `~/.openclaw/workspace/mail/inbox/` | Email storage |
