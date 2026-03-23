# Resend Listening Daemon (resendld) — Project Plan

**Status:** Phase 0 Kickoff (Single-shot build, no phases)  
**Timeline:** Scrappy execution with parallel sub-agent teams  
**Target:** Complete production-grade delivery end-to-end  
**Start Date:** 2026-03-23 10:47 EDT

---

## 🎯 Project Vision

**resendld** is a local-first email listening daemon that:
1. Listens on Resend email boxes (configured in `~/.config/resendld/boxes.json`)
2. Receives emails via `resend emails receiving listen --to <user@domain.tld>`
3. Stores messages locally (markdown + attachments)
4. Delivers to OpenClaw gateway in real-time
5. Provides web UI (resendld.localhost:443) for reading, managing, replying

**Tech Stack:**
- Backend: Daemon (zsh), Convex (local), Bun
- Frontend: TanStack Start + Router, shadcn/ui, Phosphor Icons
- Infra: Caddy (SSL), systemd/launchd for daemon lifecycle
- Storage: `~/.openclaw/workspace/mail/inbox/`

---

## 📦 Project Structure

```
~/Projects/resend-listening-daemon/
├── src/
│   ├── resendld.sh                    # Main daemon script (zsh)
│   ├── daemon/
│   │   ├── listen.ts                  # Resend listening loop (Codex task)
│   │   ├── gateway.ts                 # OpenClaw gateway delivery (Codex task)
│   │   └── storage.ts                 # Local file/markdown writer (Claude Code task)
│   ├── cli/
│   │   ├── index.ts                   # CLI entry (box add/list/status, etc) (Claude Code task)
│   │   └── commands.ts                # Commands (archive, delete, mark spam, reply) (Claude Code task)
│   └── tui/
│       └── index.ts                   # TUI for terminal navigation (Claude Code task)
├── web/
│   ├── src/
│   │   ├── app.tsx                    # TanStack Start root (Claude Code task)
│   │   ├── routes/
│   │   │   ├── __root.tsx             # Layout + navigation (Claude Code task)
│   │   │   ├── /index.tsx             # Inbox view (Codex task)
│   │   │   ├── /[messageId]/page.tsx  # Message detail + reply (Codex task)
│   │   │   └── /boxes.tsx             # Box management (Claude Code task)
│   │   ├── components/
│   │   │   ├── MessageList.tsx        # Email list (shadcn + Phosphor) (Codex task)
│   │   │   ├── MessageDetail.tsx      # Email viewer + reply form (Codex task)
│   │   │   └── AttachmentList.tsx     # Attachment download/preview (Claude Code task)
│   │   └── hooks/
│   │       └── useConvex.ts           # Convex client integration (Claude Code task)
│   ├── convex/
│   │   ├── schema.ts                  # Messages, attachments, boxes tables (Codex task)
│   │   ├── messages.ts                # Query/mutation handlers (Codex task)
│   │   ├── attachments.ts             # Attachment metadata/sync (Claude Code task)
│   │   └── boxes.ts                   # Box CRUD (Claude Code task)
│   ├── package.json                   # Bun + TanStack Start deps (Claude Code task)
│   └── biome.json                     # Code standards (Claude Code task)
├── scripts/
│   ├── install.sh                     # Install everything to ~/.local/bin/resendld (Codex task)
│   └── caddy/
│       └── Caddyfile                  # resendld.localhost:443 config (Claude Code task)
├── config/
│   └── boxes.json.example             # Example ~/.config/resendld/boxes.json (Codex task)
└── README.md                          # Setup + usage docs (Claude Code task)
```

---

## 🤖 Sub-Agent Organization

### Team Assignment

```
PROJECT: Resend Listening Daemon (Phase 0)
├─ CODEX (Backend + Core Logic)
│  ├── Task C1: Daemon listening loop (resend emails receiving listen)
│  ├── Task C2: OpenClaw gateway delivery integration
│  ├── Task C3: Convex schema + message mutations
│  ├── Task C4: Message query handlers (list, search, detail)
│  ├── Task C5: Install script + setup logic
│  ├── Task C6: Web routes (inbox view, message detail)
│  └── Task C7: Message list + detail components
│
├─ CLAUDE CODE (Frontend + Infra)
│  ├── Task CC1: Local file storage + markdown writer
│  ├── Task CC2: CLI commands (add box, archive, delete, reply, etc)
│  ├── Task CC3: TUI for terminal (ncurses-like with ink-cli)
│  ├── Task CC4: Web app root + routing setup
│  ├── Task CC5: Attachment components + download logic
│  ├── Task CC6: Box management UI + Convex hooks
│  ├── Task CC7: Caddy configuration + SSL setup
│  ├── Task CC8: README + documentation
│  └── Task CC9: Convex attachment handlers
│
└─ COORDINATION
   ├── Daily progress posts (Michael's Telegram)
   ├── Blocker resolution (cross-agent)
   └── Integration tests (both teams)
```

### Task Dependencies

**Must Complete First (No Deps):**
- C1: Resend listening loop (defines message structure)
- C3: Convex schema (defines storage contract)
- CC1: Local storage (defines file layout)

**Then (Parallel):**
- C2: Gateway delivery (uses C1 + CC1)
- C4: Message queries (uses C3)
- CC2: CLI commands (uses C3 + CC1)
- CC3: TUI (uses CC2)

**Then (Web):**
- C6: Web routes (uses C4)
- CC4: Web app + routing (uses C6)
- C7: Components (uses C4)
- CC5-6: Web UI polish (uses C7)

**Finally:**
- C5: Install script (everything else ready)
- CC7: Caddy config (web ready)
- CC8: Docs (full system ready)

---

## 📊 Progress Reporting

### Daily Standups (Michael's Telegram)
Each agent posts at end-of-day:
```
Resendld Progress — [DATE]

✅ COMPLETED
- Task X: Brief description (commit/PR link)
- Task Y: Brief description

🔧 IN PROGRESS
- Task Z: Brief status

🚫 BLOCKERS
- (if any) Brief description of blocker + @mention requester

⏭️ NEXT
- (next task)
```

### Success Metrics
- All tasks merged to main
- `npm run build` passes
- `bun ~/Projects/resend-listening-daemon/src/resendld.sh start` works
- Web UI loads at resendld.localhost:443
- First email received, stored, displayed in web UI

---

## 🚀 Execution Plan

### Phase 0 (Single Shot)

**Step 1: Kickoff**
- [ ] Spawn Codex agent (C1-7)
- [ ] Spawn Claude Code agent (CC1-9)
- [ ] Both agents report task checklist

**Step 2: Core Loop (6-12 hours)**
- [ ] Codex: C1-C5 (listening, storage, schema, queries, install)
- [ ] Claude Code: CC1-3 (file storage, CLI, TUI)
- [ ] Both: Integration points as needed

**Step 3: Web (2-4 hours)**
- [ ] Codex: C6-7 (web routes, components)
- [ ] Claude Code: CC4-6 (web app, UI, hooks)
- [ ] Caddy setup (CC7)

**Step 4: Polish + Launch (1-2 hours)**
- [ ] Both: Docs (CC8), install testing (C5)
- [ ] Final build + test cycle
- [ ] Launch resendld daemon

---

## 🔧 Technical Specs

### Daemon (resendld.sh)
- Entry point: `resendld` command (symlinked to `~/.local/bin/resendld`)
- Commands: `start`, `stop`, `restart`, `status`, `logs`, `box add`, `box list`
- Background process: `nohup` or systemd/launchd
- Auto-restart on crash: `while true` loop with retry logic
- Config: `~/.config/resendld/boxes.json`

### Listening Loop
```bash
resend emails receiving listen --to user@domain.tld \
  | while read -r line; do
      # Parse email, store locally, deliver to gateway
      deliver_to_gateway "$email_json"
    done
```

### Local Storage Structure
```
~/.openclaw/workspace/mail/inbox/
├── from@domain.com/
│   └── Subject Line-2026-03-23-10-47/
│       ├── MSG.md              # Markdown + YAML frontmatter
│       └── attachments/
│           ├── file1.pdf
│           └── image.png
```

### MSG.md Format
```markdown
---
from: sender@example.com
to:
  - recipient@example.com
cc:
  - cc@example.com
bcc: []
subject: Subject Line
date: 2026-03-23T10:47:00Z
message_id: <unique@resend.id>
attachments:
  - path: ~/.openclaw/workspace/mail/inbox/from@domain.com/Subject-2026-03-23-10-47/attachments/file.pdf
    filename: file.pdf
    size: 12345
    mime_type: application/pdf
---

Email body in plain text or HTML.
```

### Web UI (resendld.localhost:443)
- TanStack Start + Router
- shadcn/ui + glass-design-system
- Phosphor Icons (light weight)
- No auth required (local only)
- Convex backend (local dev mode)
- Responsive (mobile + desktop)

### Convex Schema
```ts
// tables
messages: { from, to, cc, bcc, subject, body, date, messageId, attachments }
attachments: { messageId, filename, path, size, mimeType }
boxes: { email, isActive, lastSync }
```

---

## 📋 Acceptance Criteria

**Must Have:**
- [ ] Daemon runs on startup
- [ ] Listens to configured email boxes
- [ ] Emails stored locally (markdown + attachments)
- [ ] Web UI loads and displays emails
- [ ] Reply functionality works
- [ ] Archive/delete/spam actions work
- [ ] Full install script works

**Nice to Have:**
- [ ] Search across emails
- [ ] Attachment preview in web
- [ ] Mark as unread/important
- [ ] Email sync resume after crash

---

## 🎯 Ready to Kickoff

**Next Step:** Spawn sub-agents with task assignments.

All dependencies mapped. Parallel work possible. No blockers before starting.

**Estimated Delivery:** 24-36 hours for scrappy Phase 0 with full feature set.
