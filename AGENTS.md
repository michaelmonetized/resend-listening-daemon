# AGENTS.md — Codebase Quick Reference

**resend-listening-daemon** — For agents making changes, find things fast using these commands.

---

## Project Layout

```
~/Projects/resend-listening-daemon/
├── src/                          ← Daemon logic
│   ├── resendld.sh               ← Entry point: start/stop/status/logs/boxes
│   ├── daemon/
│   │   ├── listen.ts             ← Main loop: polls Resend API, stores emails
│   │   ├── gateway.ts            ← POSTs emails to OpenClaw gateway
│   │   └── storage.ts            ← Writes MSG.md + attachments to disk
│   └── cli/
│       └── index.ts              ← CLI commands (box add/remove/toggle/list)
│
├── web/                          ← Web UI (TanStack Start)
│   ├── convex/
│   │   ├── schema.ts             ← Database tables: Message, Attachment, Box
│   │   ├── messages.ts           ← Queries/mutations for messages
│   │   ├── attachments.ts        ← Queries/mutations for attachments
│   │   └── boxes.ts              ← Queries/mutations for email boxes
│   │
│   ├── src/
│   │   ├── routes/
│   │   │   ├── __root.tsx        ← Layout, sidebar, theme provider
│   │   │   ├── index.tsx         ← Inbox (main page, message list)
│   │   │   ├── [messageId]/
│   │   │   │   └── page.tsx      ← Message detail + reply form
│   │   │   └── archive.tsx       ← Archived messages
│   │   │
│   │   ├── components/
│   │   │   ├── MessageList.tsx   ← Email list with search/filter
│   │   │   ├── MessageDetail.tsx ← Read full email, headers
│   │   │   ├── ReplyForm.tsx     ← Compose + send reply
│   │   │   ├── AttachmentList.tsx ← Download files
│   │   │   ├── Sidebar.tsx       ← Nav, box list, labels
│   │   │   └── SearchBar.tsx     ← Full-text search
│   │   │
│   │   ├── hooks/
│   │   │   ├── useConvex.ts      ← Custom hook: fetch/mutate Convex
│   │   │   ├── useMessages.ts    ← Custom hook: fetch messages with filters
│   │   │   └── useAttachments.ts ← Custom hook: fetch file metadata
│   │   │
│   │   ├── lib/
│   │   │   ├── utils.ts          ← Helpers: format dates, sanitize HTML, etc
│   │   │   ├── constants.ts      ← UI constants (colors, page sizes)
│   │   │   └── types.ts          ← TypeScript interfaces
│   │   │
│   │   ├── app.tsx               ← Root app component
│   │   ├── client.tsx            ← Convex client setup
│   │   └── entry-server.tsx      ← Server entry point
│   │
│   ├── package.json
│   ├── tailwind.config.ts        ← Tailwind CSS config
│   ├── biome.json                ← Linting config
│   └── tsconfig.json
│
├── scripts/
│   ├── install.sh                ← Installation script (macOS + Arch)
│   └── caddy/
│       └── Caddyfile             ← Reverse proxy config (localhost:443)
│
├── config/
│   └── boxes.json.example        ← Example email boxes config
│
├── install.sh                    ← Main installer (run this)
├── listen.js                     ← Compiled daemon (generated)
├── package.json                  ← Root package manifest
└── README.md
```

---

## Find & Search Commands

### Find Files by Pattern

```bash
# Find all TypeScript files
fd "\.ts$" ~/Projects/resend-listening-daemon/

# Find Convex schema/queries
fd "(schema|messages|attachments|boxes)" ~/Projects/resend-listening-daemon/web/convex/

# Find React components
fd "\.tsx$" ~/Projects/resend-listening-daemon/web/src/components/

# Find route files
fd "route|page" ~/Projects/resend-listening-daemon/web/src/routes/

# Find test files
fd "\.test\." ~/Projects/resend-listening-daemon/
```

### Search Code by Keyword

```bash
# Search for Resend API calls
rg "resend\." ~/Projects/resend-listening-daemon/src/

# Search for OpenClaw gateway posts
rg "gateway\|OPENCLAW" ~/Projects/resend-listening-daemon/src/

# Search for database mutations
rg "mutations\|db\." ~/Projects/resend-listening-daemon/web/convex/

# Search for React hooks
rg "useQuery\|useMutation" ~/Projects/resend-listening-daemon/web/src/

# Search for email storage logic
rg "MSG\.md\|storage\|mkdir" ~/Projects/resend-listening-daemon/src/daemon/

# Search for error handling
rg "catch|error|Error" ~/Projects/resend-listening-daemon/src/daemon/listen.ts

# Search for config references
rg "boxes\.json\|config" ~/Projects/resend-listening-daemon/src/
```

---

## Key Files to Modify

### Listening Loop Changes
- **File:** `src/daemon/listen.ts`
- **Purpose:** Main polling loop that connects to Resend API
- **Modify when:** Adding new Resend API integrations, changing poll frequency, adding filters
- **Related:** `src/daemon/storage.ts`, `src/daemon/gateway.ts`

### Storage Logic
- **File:** `src/daemon/storage.ts`
- **Purpose:** Writes emails to `~/.openclaw/workspace/mail/inbox/` as markdown
- **Modify when:** Changing metadata, attachment handling, file structure
- **Format:** Each email is `MSG.md` with YAML frontmatter + body

### Gateway Integration
- **File:** `src/daemon/gateway.ts`
- **Purpose:** POSTs emails to OpenClaw gateway for real-time delivery
- **Modify when:** Changing notification format, adding metadata, custom headers
- **Endpoint:** `POST http://localhost:8000/webhook/email`

### Database Schema
- **File:** `web/convex/schema.ts`
- **Tables:** `Message`, `Attachment`, `Box`, `Label`
- **Modify when:** Adding new fields, changing data structure, new queries
- **Build:** Auto-generates TypeScript types

### Database Queries & Mutations
- **Files:** `web/convex/messages.ts`, `attachments.ts`, `boxes.ts`
- **Modify when:** Adding search, filters, archive logic, label operations
- **Example query:** `export const listMessages = query(...)` 

### Web UI Routes
- **Files:** `web/src/routes/index.tsx`, `[messageId]/page.tsx`, `archive.tsx`
- **Modify when:** Adding new pages, changing layouts, adding features
- **State:** Use Convex queries/mutations + TanStack Router for navigation

### React Components
- **Dir:** `web/src/components/`
- **Modify when:** Changing UI, adding new features, fixing styles
- **Style:** Tailwind CSS + shadcn/ui

### CLI Commands
- **File:** `src/cli/index.ts`
- **Modify when:** Adding new commands (box add, archive, etc.)
- **Related:** `src/resendld.sh` (bash entry point)

---

## Common Tasks

### Add a New CLI Command

1. Add function to `src/cli/index.ts`:
   ```typescript
   export function boxToggle(email: string) { ... }
   ```

2. Wire to `src/resendld.sh`:
   ```bash
   "toggle")
     bun run src/cli/index.ts toggle "$2"
     ;;
   ```

### Add a New Database Field

1. Modify `web/convex/schema.ts` (add to `Message`, `Attachment`, or `Box` table)
2. Update `web/convex/messages.ts` (or relevant file) to handle new field
3. Update React components to display new field
4. Run: `cd web && bun run convex dev` to regenerate types

### Change Email Storage Format

1. Edit `src/daemon/storage.ts` where `MSG.md` is written
2. Update YAML frontmatter or body format
3. Update parser if reading old emails
4. Test with: `bun src/daemon/listen.ts` in dev

### Add a New Web UI Page

1. Create new file in `web/src/routes/` (e.g., `settings.tsx`)
2. Add route to `web/src/app.tsx` or TanStack Router config
3. Use Convex queries/mutations for data
4. Link from sidebar in `web/src/components/Sidebar.tsx`

### Debug Listening Loop

```bash
# Check daemon logs
resendld logs

# Run in dev (no daemon)
cd ~/Projects/resend-listening-daemon
bun src/daemon/listen.ts --verbose

# Check if Resend CLI works
resend emails receiving listen --to test@example.com
```

### Debug Web UI

```bash
# Check if Convex is running
npx convex status

# Rebuild web types
cd web && bun run convex dev

# Check browser console for errors
# Open: https://resendld.localhost (or http://localhost:3000)
```

---

## Dependencies & Tools

### Daemon (Node.js)
- **bun** — Runtime (or Node.js)
- **@resend/cli** — Resend API integration
- No npm packages in root (uses bun native modules where possible)

### Web UI
- **React** — UI library
- **TanStack Start** — Framework (file-based routing)
- **TanStack Router** — Client-side routing
- **Convex** — Backend + database
- **Tailwind CSS** — Styling
- **shadcn/ui** — Component library
- **Phosphor Icons** — Icons
- All in `web/package.json`

### System Tools
- **Caddy** — Reverse proxy (SSL on localhost)
- **jq** — JSON parsing in scripts
- **systemd** (Linux) or **launchd** (macOS) — Auto-start

---

## Testing & QA

### Type Check
```bash
cd web
bun run type-check
```

### Lint
```bash
cd web
bun run lint
```

### Format
```bash
cd web
bun run format
```

### Build
```bash
cd ~/Projects/resend-listening-daemon
bun build src/daemon/listen.ts --target bun --outfile listen.js

cd web
bun run build
```

### Manual Testing
1. Ensure daemon is running: `resendld status`
2. Send test email to configured box
3. Check web UI: `https://resendld.localhost`
4. Verify email appears in inbox within 10 seconds
5. Check disk storage: `ls -la ~/.openclaw/workspace/mail/inbox/`

---

## Git Workflow

```bash
# Create a feature branch
git checkout -b feat/amazing-feature

# Make changes
# ... edit files ...

# Commit with message
git commit -am "feat: add amazing feature"

# Push
git push origin feat/amazing-feature

# Create PR on GitHub
gh pr create --title "feat: add amazing feature" --body "Description..."
```

---

## Performance Notes

- **Listening loop:** Polls Resend API every 10 seconds (configurable)
- **Database queries:** Convex caches automatically, very fast
- **Web UI:** React w/ TanStack Router handles routing client-side
- **Storage:** Local markdown files, no database needed for email body
- **Gateway posts:** Non-blocking, doesn't slow down listening loop

---

## Known Limitations & TODOs

- [ ] Full-text search not yet implemented (WIP in Convex)
- [ ] Labels/tagging UI incomplete
- [ ] Reply forwarding via SMTP (need Resend SMTP setup)
- [ ] Mobile web UI not yet responsive
- [ ] Offline mode (cached message list) not implemented
- [ ] Archiving/deleting not yet implemented in UI
- [ ] Email threading (group replies) not yet supported

---

## Quick Reference: Commands

```bash
# Jump to installation
cd ~/.local/bin/resendld

# Jump to source
cd ~/Projects/resend-listening-daemon

# Daemon control
resendld start | stop | restart | status | logs

# Box management
resendld box add user@example.com
resendld box list
resendld box remove user@example.com

# Development
cd web && bun run dev          # Start web UI (dev mode)
npx convex dev                 # Start Convex backend
bun src/daemon/listen.ts       # Run daemon (dev mode)

# Testing
cd web && bun run type-check
cd web && bun run lint
cd web && bun run format

# Git
git checkout -b feat/name
git commit -am "message"
git push origin feat/name
gh pr create --title "..." --body "..."
```

---

**Last updated:** March 24, 2026
