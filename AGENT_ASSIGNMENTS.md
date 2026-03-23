# Sub-Agent Task Assignments — Resend Listening Daemon Phase 0

**Project:** Resendld (Email Listening + Web UI)  
**Status:** Kickoff Ready  
**Delivery Target:** Single-shot Phase 0 (24-36 hours scrappy delivery)

---

## 🤖 Team: CODEX

**Focus:** Backend + Core Logic + Convex  
**Dependencies:** None (self-contained tasks first)

### Task C1: Resend Listening Loop & Email Parsing
**File:** `src/daemon/listen.ts`  
**Deliverables:**
- [ ] Read `~/.config/resendld/boxes.json` (list of email boxes)
- [ ] For each active box, spawn `resend emails receiving listen --to <user@domain.tld>`
- [ ] Parse incoming email stream (subject, from, to/cc/bcc, body, attachments)
- [ ] Structure as JSON (match Convex schema)
- [ ] Pass to gateway delivery (C2) for OpenClaw notification
- [ ] Return email metadata + attachment list for C3 storage

**Input:** None (reads config on startup)  
**Output:** Email JSON objects to stdout/gateway  
**Dependencies:** resend-cli fork (~/Projects/resend-cli)  
**Tests:** Verify `resend emails receiving listen` works with test emails

---

### Task C2: OpenClaw Gateway Delivery
**File:** `src/daemon/gateway.ts`  
**Deliverables:**
- [ ] Accept email JSON from C1
- [ ] Format as OpenClaw message event
- [ ] POST to gateway (configured in env or ~/.openclaw/workspace/GATEWAY_URL)
- [ ] Include: from, to, subject, preview of body, attachment count
- [ ] Handle retries (exponential backoff if gateway unavailable)
- [ ] Log delivery success/failure

**Input:** Email JSON from C1  
**Output:** Gateway notification delivered  
**Dependencies:** C1 (email parsing)  
**Env Vars:** `OPENCLAW_GATEWAY_URL` (default: localhost:8000)

---

### Task C3: Convex Schema & Type Definitions
**File:** `web/convex/schema.ts`  
**Deliverables:**
- [ ] Table: `messages` (from, to, cc, bcc, subject, body, bodyHtml, date, messageId, isRead, isStarred, labels, boxEmail)
- [ ] Table: `attachments` (messageId, filename, filepath, size, mimeType)
- [ ] Table: `boxes` (email, isActive, lastSync, messageCount)
- [ ] Indexes: messageId, from, boxEmail, date (for filtering)
- [ ] TypeScript types (Message, Attachment, Box)
- [ ] Export schema + types for frontend

**Input:** None (schema definition)  
**Output:** `schema.ts` + TypeScript types  
**Dependencies:** None  
**Tests:** Schema compiles + basic queries

---

### Task C4: Message Query & Mutation Handlers
**File:** `web/convex/messages.ts`  
**Deliverables:**
- [ ] Query: `getMessages(boxEmail?, limit?, offset?, searchTerm?)`
- [ ] Query: `getMessage(messageId)` with full body + attachments
- [ ] Mutation: `storeMessage(email JSON)` (write from C1)
- [ ] Mutation: `markAsRead(messageId)`
- [ ] Mutation: `toggleStar(messageId)`
- [ ] Mutation: `addLabel(messageId, label)`
- [ ] Mutation: `deleteMessage(messageId)`
- [ ] Mutation: `archiveMessage(messageId)` (mark as archived, don't delete)

**Input:** Email data from C1 + frontend actions  
**Output:** Messages stored in Convex + query results to frontend  
**Dependencies:** C3 (schema)  
**Tests:** Store + query + update + delete

---

### Task C5: Install Script & Setup
**File:** `scripts/install.sh`  
**Deliverables:**
- [ ] Check dependencies: bun, node, resend-cli, jq, caddy
- [ ] Install to `~/.local/bin/resendld`
- [ ] Copy `src/resendld.sh` → `~/.local/bin/resendld/resendld`
- [ ] Make executable, add to PATH
- [ ] Initialize `~/.config/resendld/boxes.json`
- [ ] Create systemd service (Linux) or launchd plist (macOS)
- [ ] Configure Caddy (CC7 provides Caddyfile)
- [ ] Test: `resendld status` works

**Input:** User runs `bash scripts/install.sh`  
**Output:** Everything installed + daemon ready to start  
**Dependencies:** All other tasks (they must be done first)  
**Tests:** `resendld start` → logs appear, web UI loads

---

### Task C6: Web Routes (TanStack Router)
**File:** `web/src/routes/`  
**Deliverables:**
- [ ] `__root.tsx` — Layout with sidebar (boxes list), top nav
- [ ] `index.tsx` — Inbox view (message list from C4)
- [ ] `[messageId]/page.tsx` — Message detail + reply form
- [ ] Hooks: `useMessages()`, `useMessage(id)`, `useReply(messageId)`
- [ ] Loaders: Fetch messages/attachments on route load
- [ ] Error boundaries for failed queries

**Input:** Message data from C4  
**Output:** Routes + components that display emails  
**Dependencies:** C4 (queries), C7 (styling)  
**Tests:** Navigate inbox → detail → reply

---

### Task C7: Message Components (shadcn/ui + Phosphor)
**File:** `web/src/components/`  
**Deliverables:**
- [ ] `MessageList.tsx` — List of emails (sender, subject, date, preview)
- [ ] `MessageDetail.tsx` — Full email display (from, to, cc, bcc, body, subject)
- [ ] `AttachmentList.tsx` — List attachments with download buttons
- [ ] `ReplyForm.tsx` — Compose reply (to, cc, bcc, body textarea)
- [ ] Use shadcn/ui for modals, buttons, inputs
- [ ] Use Phosphor Icons for UI (mail, archive, trash, star, etc)
- [ ] Use glass-design-system for theming

**Input:** Message data from C4  
**Output:** Reusable React components  
**Dependencies:** C4 (data), TanStack Start setup  
**Tests:** Components render + buttons work

---

## 🤖 Team: CLAUDE CODE

**Focus:** Frontend + Infra + Tooling  
**Dependencies:** Codex tasks C1-3

### Task CC1: Local File Storage & Markdown Writer
**File:** `src/daemon/storage.ts`  
**Deliverables:**
- [ ] Create directory: `~/.openclaw/workspace/mail/inbox/{from}/{subject}-{date}/`
- [ ] Write `MSG.md` with YAML frontmatter + body
- [ ] Frontmatter: from, to, cc, bcc, subject, date, messageId, attachments
- [ ] Download attachments to `attachments/{filename}`
- [ ] Handle duplicate subjects (append timestamp)
- [ ] Backup every message as markdown (for text search, archival)

**Input:** Email JSON from C1  
**Output:** Local markdown files + attachments  
**Dependencies:** C1 (email data)  
**Tests:** Email received → MSG.md created with correct path

---

### Task CC2: CLI Commands
**File:** `src/cli/commands.ts`  
**Deliverables:**
- [ ] `resendld box add EMAIL` — Add box (via `resendld.sh`)
- [ ] `resendld box list` — Show boxes
- [ ] `resendld box remove EMAIL` — Remove box
- [ ] `resendld archive MESSAGE_ID` — Archive message
- [ ] `resendld delete MESSAGE_ID` — Delete message
- [ ] `resendld spam MESSAGE_ID` — Mark as spam
- [ ] `resendld reply MESSAGE_ID --to ADDR --body "text"` — Reply to email
- [ ] All commands update Convex via mutations (C4)
- [ ] Pretty output (colors, tables, etc)

**Input:** CLI arguments  
**Output:** Convex mutations + human-readable feedback  
**Dependencies:** C4 (mutations)  
**Tests:** `resendld archive <id>` → message marked archived in Convex

---

### Task CC3: Terminal UI (TUI)
**File:** `src/tui/index.ts`  
**Deliverables:**
- [ ] Interactive inbox browser (arrow keys, enter to open)
- [ ] Show: from, subject, date, unread indicator
- [ ] Detail view: full email + attachments
- [ ] Commands: `a` (archive), `d` (delete), `s` (spam), `r` (reply), `q` (quit)
- [ ] Use ink-cli or blessed for UI
- [ ] Auto-refresh when new emails arrive

**Input:** Message list from Convex  
**Output:** Interactive terminal UI  
**Dependencies:** C4 (queries)  
**Tests:** Launch TUI, navigate emails, execute commands

---

### Task CC4: Web App Root & Routing Setup
**File:** `web/src/app.tsx`, `package.json`, etc  
**Deliverables:**
- [ ] TanStack Start project setup (bun install)
- [ ] Router configuration (TanStack Router)
- [ ] Convex client provider setup
- [ ] Global CSS (shadcn/ui + Tailwind)
- [ ] Entry point wired to routes (C6)
- [ ] `package.json` with all deps: @tanstack/start, @tanstack/router, convex, shadcn/ui, phosphor-icons, etc

**Input:** None (setup)  
**Output:** Working web app structure  
**Dependencies:** C3 (Convex schema)  
**Tests:** `bun run dev` → app starts on localhost

---

### Task CC5: Attachment Components & Download Logic
**File:** `web/src/components/AttachmentList.tsx`, `hooks/useAttachments.ts`  
**Deliverables:**
- [ ] Display attachment list (filename, size, mime type)
- [ ] Download button (links to `~/.openclaw/workspace/mail/inbox/.../attachment/`)
- [ ] Preview images inline (if MIME type is image/*)
- [ ] Handle missing attachments gracefully
- [ ] Query attachment metadata from Convex (C4)

**Input:** Attachment data from C4  
**Output:** UI components + download functionality  
**Dependencies:** C4 (attachment queries)  
**Tests:** Attachment downloaded successfully

---

### Task CC6: Box Management UI & Convex Hooks
**File:** `web/src/routes/boxes.tsx`, `web/src/hooks/useConvex.ts`  
**Deliverables:**
- [ ] Page to list/add/remove boxes
- [ ] Form: input email, submit to add
- [ ] List: show boxes + active status + message count
- [ ] Button: remove box
- [ ] Custom hooks: `useBoxes()`, `useAddBox()`, `useRemoveBox()`
- [ ] Call C4 mutations to manage boxes

**Input:** User actions (add/remove box)  
**Output:** Boxes list updated in Convex + UI  
**Dependencies:** C4 (box mutations)  
**Tests:** Add box → appears in list → remove → gone

---

### Task CC7: Caddy Configuration & SSL Setup
**File:** `scripts/caddy/Caddyfile`  
**Deliverables:**
- [ ] Configure Caddy to route `resendld.localhost:443` → `localhost:3000` (web server)
- [ ] Auto-generate self-signed SSL cert for localhost
- [ ] Trust cert on macOS/Linux so browser doesn't warn
- [ ] Config: enable gzip, set headers
- [ ] Test: `https://resendld.localhost` loads web UI

**Input:** None (Caddy config)  
**Output:** Caddyfile + cert installation  
**Dependencies:** None (runs alongside web server)  
**Tests:** curl https://resendld.localhost → 200 OK

---

### Task CC8: README & Documentation
**File:** `README.md`, `docs/` folder  
**Deliverables:**
- [ ] Installation instructions (run install.sh)
- [ ] Quick start (add box, view inbox)
- [ ] CLI reference (resendld commands)
- [ ] Web UI guide (how to use features)
- [ ] Troubleshooting (common issues)
- [ ] Architecture diagram (daemon → storage → Convex → web)

**Input:** All completed tasks  
**Output:** User-friendly documentation  
**Dependencies:** All tasks (write docs last)  
**Tests:** New user can install + use without asking

---

### Task CC9: Convex Attachment Handlers
**File:** `web/convex/attachments.ts`  
**Deliverables:**
- [ ] Mutation: `storeAttachmentMetadata(messageId, filename, filepath, size, mimeType)`
- [ ] Query: `getAttachments(messageId)`
- [ ] Mutation: `deleteAttachments(messageId)` (when message deleted)
- [ ] Sync with local files (CC1)

**Input:** Attachment data from C1  
**Output:** Attachment metadata stored + queries available  
**Dependencies:** C3 (schema), CC1 (file storage)  
**Tests:** Attachment stored → query returns metadata

---

## 📋 Task Sequencing

**Phase 0A: Foundation (Parallel, 4-6 hours)**
- C1: Resend listening loop
- C3: Convex schema
- CC1: Local storage writer

**Phase 0B: Core Logic (Parallel, 4-6 hours)**
- C2: Gateway delivery (needs C1)
- C4: Convex handlers (needs C3)
- CC2: CLI commands (needs C4)
- CC3: TUI (needs C4)
- CC9: Attachment handlers (needs C3, CC1)

**Phase 0C: Web (Parallel, 3-4 hours)**
- CC4: Web app setup
- C6: Routes (needs C4)
- C7: Components (needs C4)
- CC5: Attachments UI (needs C4)
- CC6: Box management (needs C4)

**Phase 0D: Infrastructure (Parallel, 1-2 hours)**
- C5: Install script (needs all else)
- CC7: Caddy config
- CC8: Docs

**Total:** ~24-36 hours for full scrappy delivery

---

## 🚀 Execution

### Codex Agent Kickoff
```
Spawn runtime=subagent with tasks: C1, C2, C3, C4, C5, C6, C7
Model: openai-codex/gpt-5.4
Timeout: 120 min (first pass, iterate if needed)
```

### Claude Code Agent Kickoff
```
Spawn runtime=subagent with tasks: CC1, CC2, CC3, CC4, CC5, CC6, CC7, CC8, CC9
Model: anthropic/claude-opus-4-5
Timeout: 120 min (first pass, iterate if needed)
```

### Daily Sync
- 12:00 EDT: Both agents report progress to Michael's Telegram
- Flag blockers immediately
- Cross-agent dependencies resolved real-time

---

## ✅ Success Criteria

- [ ] `resendld start` launches daemon
- [ ] Email received → stored locally + Convex
- [ ] Web UI loads at `https://resendld.localhost`
- [ ] Emails displayed in inbox, clickable to view detail
- [ ] Reply functionality works
- [ ] Archive/delete/spam actions work
- [ ] Install script runs end-to-end without manual steps
- [ ] All tests pass
- [ ] README complete + user-friendly

**Ready to kickoff?** Yes. Spawn agents now.
