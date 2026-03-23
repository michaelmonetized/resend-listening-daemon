# Resend Listening Daemon (resendld)

**A local-first email listening daemon that receives emails from Resend, stores them locally, and provides a web UI for reading, managing, and replying.**

## Features

- ✉️ **Real-time email receiving** — Listen to multiple Resend email boxes simultaneously
- 📦 **Local-first storage** — Emails stored as markdown + attachments in `~/.openclaw/workspace/mail/`
- 🌐 **Web UI** — Read, search, manage, and reply to emails via `https://resendld.localhost`
- 🔐 **OpenClaw integration** — Delivers email notifications to OpenClaw gateway in real-time
- 💾 **Convex backend** — Fast queries, full-text search, labels, archiving
- 🎨 **Beautiful UI** — Built with TanStack Router, shadcn/ui, Phosphor icons, Tailwind CSS

## Quick Start

### Prerequisites

```bash
# Install dependencies
brew install bun node jq caddy
npm install -g @resend/cli

# Authenticate with Resend
resend auth login
```

### Installation

```bash
# Clone and install
cd ~/Projects/resend-listening-daemon
bash scripts/install.sh
```

This will:
- Copy daemon to `~/.local/bin/resendld`
- Create `~/.config/resendld/boxes.json` with example config
- Set up systemd/launchd service for auto-start
- Build TypeScript → JavaScript
- Install web dependencies

### Configuration

Edit `~/.config/resendld/boxes.json`:

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

### Start the Daemon

```bash
# Start daemon + web UI
resendld start

# Check status
resendld status

# View logs
resendld logs

# Stop daemon
resendld stop
```

The daemon will start:
- **Listening loop** (src/daemon/listen.ts) — Monitors configured boxes
- **Convex dev server** — Local backend
- **Web server** — TanStack Start dev server on localhost:3000
- **Caddy reverse proxy** — SSL at https://resendld.localhost

## Usage

### Web UI

Open **https://resendld.localhost** in your browser.

**Features:**
- **Inbox** — View all emails, sorted by newest first
- **Message detail** — Read full email, download attachments, see metadata
- **Reply** — Compose and send replies
- **Archive** — Move emails to archive (don't delete)
- **Labels** — Tag emails for organization
- **Search** — Full-text search across subject, body, from address

### CLI

```bash
# Box management
resendld box add user@example.com
resendld box list
resendld box remove user@example.com

# Message actions (future)
resendld archive <messageId>
resendld delete <messageId>
resendld spam <messageId>
resendld reply <messageId> --to user@example.com --body "text"
```

### Local Storage

Emails are stored in `~/.openclaw/workspace/mail/inbox/`:

```
~/.openclaw/workspace/mail/inbox/
├── sender-name/
│   ├── subject-line-2026-03-23-abc123def/
│   │   ├── MSG.md              (email with YAML frontmatter + body)
│   │   ├── index.json          (quick metadata reference)
│   │   └── attachments/        (downloaded files)
│   │       ├── document.pdf
│   │       └── image.png
│   └── another-email.../
```

**MSG.md format:**

```markdown
---
messageId: abc123
from: sender@example.com
to:
  - you@example.com
cc:
  - cc@example.com
subject: Hello!
date: 2026-03-23T15:30:00Z
attachments:
  - filename: document.pdf
---

Email body content goes here.
It's plain text or HTML (if bodyHtml is available).
```

## Architecture

```
Resend API
    ↓
[Daemon] listen.ts → Spawns resend CLI, parses emails
    ↓
Parallel processing:
    ├→ storage.ts → Writes MSG.md + attachments locally
    ├→ gateway.ts → POSTs to OpenClaw gateway
    └→ Convex mutations → Stores in database
         ↓
[Web UI]
    ├→ TanStack Router (routes)
    ├→ React Components (inbox, detail, reply)
    ├→ Convex queries (fetch messages)
    └→ Caddy (SSL reverse proxy)
```

## Development

### File Structure

```
~/Projects/resend-listening-daemon/
├── src/
│   ├── resendld.sh              (Main daemon entry point)
│   ├── daemon/
│   │   ├── listen.ts            (Resend listening loop)
│   │   ├── gateway.ts           (OpenClaw delivery)
│   │   └── storage.ts           (Local file storage)
│   ├── cli/                     (CLI commands)
│   └── tui/                     (Terminal UI - future)
├── web/
│   ├── convex/
│   │   ├── schema.ts            (Message, Attachment, Box tables)
│   │   ├── messages.ts          (Queries + mutations)
│   │   └── _generated/          (Convex generated code)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── __root.tsx       (Layout + sidebar)
│   │   │   ├── index.tsx        (Inbox)
│   │   │   └── [messageId]/page.tsx (Message detail + reply)
│   │   ├── components/
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageDetail.tsx
│   │   │   ├── ReplyForm.tsx
│   │   │   └── AttachmentList.tsx
│   │   ├── hooks/               (useMessages, etc)
│   │   └── app.tsx
│   ├── package.json
│   ├── tailwind.config.ts
│   └── biome.json
├── scripts/
│   ├── install.sh
│   └── caddy/Caddyfile
├── config/
│   └── boxes.json.example
└── README.md
```

### Local Development

```bash
# Install dependencies
cd ~/Projects/resend-listening-daemon/web
bun install

# Start Convex dev server
npx convex dev

# In another terminal, start web server
bun run dev

# In another terminal, start daemon
cd ~/Projects/resend-listening-daemon
bun src/daemon/listen.ts
```

### Running Tests

```bash
# Check TypeScript
cd web && bun run type-check

# Lint code
bun run lint

# Format code
bun run format
```

## Troubleshooting

### "resendld: command not found"

Add to your shell config (`~/.zshrc`, `~/.bashrc`):
```bash
export PATH="$HOME/.local/bin/resendld:$PATH"
```

Then reload:
```bash
source ~/.zshrc  # or ~/.bashrc
```

### "Failed to connect to gateway"

Check that OpenClaw gateway is running:
```bash
curl http://localhost:8000/health
```

Or set custom gateway URL:
```bash
export OPENCLAW_GATEWAY_URL="http://192.168.1.100:8000"
resendld start
```

### "No emails appearing"

1. Check boxes are active in `~/.config/resendld/boxes.json`
2. Verify resend-cli is authenticated: `resend auth list`
3. Check daemon logs: `resendld logs`
4. Test listening manually: `resend emails receiving listen --to test@example.com`

### "Web UI not loading"

1. Ensure daemon started successfully: `resendld status`
2. Check Caddy is running: `pgrep -i caddy`
3. Trust SSL cert (first visit): Click "Advanced" → "Accept risk"
4. Or visit `http://localhost:3000` directly (no SSL)

### "SQLite: database is locked"

Convex dev server conflict. Kill all Convex processes:
```bash
pkill -f "convex dev"
resendld restart
```

## Contributing

Pull requests welcome! Please:
1. Fork the repo
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -am "Add amazing feature"`)
4. Push to branch (`git push origin feat/amazing-feature`)
5. Open PR with description

## License

MIT

## Support

- **GitHub Issues:** Report bugs and feature requests
- **Discussions:** Ask questions and share ideas
- **Email:** Contact maintainers

---

**Built with ❤️ by the Resendld team**

*Last updated: 2026-03-23*
