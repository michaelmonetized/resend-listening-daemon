# Resendld Phase 0 Kickoff — Agent Quickstart

**Project Root:** `~/Projects/resend-listening-daemon/`  
**Status:** Ready to spawn sub-agents  
**Delivery Target:** Single-shot Phase 0, 24-36 hours

---

## 📖 Before You Start

1. Read `PROJECT_PLAN.md` — Full vision + architecture
2. Read `AGENT_ASSIGNMENTS.md` — Your task list + sequencing
3. Read `src/resendld.sh` — Daemon script (understand lifecycle)

---

## 🤖 CODEX TEAM

### Your Tasks
C1, C2, C3, C4, C5, C6, C7 (see AGENT_ASSIGNMENTS.md for details)

### Quick Overview
- **C1:** Resend listening loop (read config, spawn `resend emails receiving listen`)
- **C2:** OpenClaw gateway delivery (POST email events to gateway)
- **C3:** Convex schema (messages, attachments, boxes tables)
- **C4:** Convex queries/mutations (store, fetch, update messages)
- **C5:** Install script (copy daemon to ~/.local/bin/resendld, create systemd/launchd)
- **C6:** Web routes (TanStack Router: inbox, detail, reply)
- **C7:** Message components (shadcn/ui, Phosphor icons)

### Getting Started
```bash
cd ~/Projects/resend-listening-daemon

# Understand the structure
ls -la src/ web/ scripts/

# Check resend-cli fork (your dependency for C1)
ls -la ~/Projects/resend-cli

# Start with C1 (no deps)
# Then C3 (schema, foundation for queries)
# Then C2, C4 (gateway + queries, parallel with C1/C3)
# Then C5 (install, needs everything)
# Then C6, C7 (web, parallel)
```

### Files You'll Create
```
src/daemon/
  ├── listen.ts          (C1) — Resend listening loop
  ├── gateway.ts         (C2) — OpenClaw delivery
  └── (listen.js)        (C1 compiled, bun output)

web/convex/
  ├── schema.ts          (C3) — Table definitions
  ├── messages.ts        (C4) — Queries + mutations
  └── attachments.ts     (CC9, but you build schema for this)

web/src/routes/
  ├── __root.tsx         (C6) — Layout
  ├── index.tsx          (C6) — Inbox
  └── [messageId]/page.tsx (C6) — Detail + reply

web/src/components/
  ├── MessageList.tsx    (C7)
  ├── MessageDetail.tsx  (C7)
  └── ReplyForm.tsx      (C7)

scripts/
  └── install.sh         (C5) — Full install
```

### Key Dependencies (For You)
- `~/Projects/resend-cli` (your fork, has `resend emails receiving listen`)
- `@convex/chat` patterns (reference for schema design)
- `@tanstack/router` (web routing)

### Daily Report Format
```
Resendld Progress — [DATE]

✅ COMPLETED
- C1: Resend listening loop (compiles, ready for test emails)
- C3: Convex schema + types (all tables defined)

🔧 IN PROGRESS
- C2: Gateway delivery (75% done, testing retry logic)

🚫 BLOCKERS
- Need CC1 output format (file paths) before C5 install script

⏭️ NEXT
- C4: Finish queries, then C6/C7 (routes/components)
```

---

## 🤖 CLAUDE CODE TEAM

### Your Tasks
CC1, CC2, CC3, CC4, CC5, CC6, CC7, CC8, CC9 (see AGENT_ASSIGNMENTS.md for details)

### Quick Overview
- **CC1:** Local file storage (download attachments, write MSG.md with YAML frontmatter)
- **CC2:** CLI commands (box add/remove, archive/delete/spam, reply)
- **CC3:** TUI (terminal UI with ink-cli or blessed)
- **CC4:** Web app setup (TanStack Start, package.json, entry point)
- **CC5:** Attachment UI components (download buttons, image preview)
- **CC6:** Box management UI (add/list/remove boxes in web)
- **CC7:** Caddy config (resendld.localhost:443 SSL routing)
- **CC8:** README + docs (after everything else)
- **CC9:** Convex attachment handlers (mutations/queries for attachments)

### Getting Started
```bash
cd ~/Projects/resend-listening-daemon

# Understand structure
ls -la src/ web/ scripts/

# Codex's C1 defines email format — wait for that or assume standard SMTP structure
# Start with CC1 (no deps, just file I/O)
# Then CC4 (web setup, foundation)
# Then CC2, CC3, CC9 (parallel: CLI, TUI, attachments in Convex)
# Then CC5, CC6 (web components, parallel)
# Then CC7 (Caddy config)
# Finally CC8 (docs)
```

### Files You'll Create
```
src/daemon/
  └── storage.ts         (CC1) — Write MSG.md + download attachments

src/cli/
  ├── index.ts           (CC2) — Entry point for CLI commands
  └── commands.ts        (CC2) — Command implementations

src/tui/
  └── index.ts           (CC3) — Terminal UI

web/
  ├── package.json       (CC4) — Dependencies (TanStack, Convex, shadcn, etc)
  ├── bun.lockb          (CC4) — Lockfile
  ├── tailwind.config.ts (CC4)
  ├── biome.json         (CC4)
  └── src/
      ├── app.tsx        (CC4) — Root component
      ├── entry.tsx      (CC4) — Server entry
      ├── routes/        (C6 builds this, but you integrate)
      ├── components/
      │   ├── AttachmentList.tsx (CC5)
      │   └── (C7 builds others)
      ├── hooks/
      │   ├── useConvex.ts       (CC6)
      │   └── useAttachments.ts  (CC5)
      └── convex/
          └── attachments.ts     (CC9)

scripts/
  └── caddy/
      └── Caddyfile      (CC7)

docs/
└── (CC8)
```

### Key Dependencies (For You)
- `bun` (web runtime)
- `@tanstack/start` + `@tanstack/router` (web framework)
- `convex` (backend)
- `shadcn/ui` + `@phosphor-icons/react` (UI)
- `caddy` (SSL reverse proxy)

### Daily Report Format
```
Resendld Progress — [DATE]

✅ COMPLETED
- CC1: Local storage writer (creates MSG.md with frontmatter, downloads attachments)
- CC4: Web app setup (TanStack Start running, can serve static)

🔧 IN PROGRESS
- CC2: CLI commands (add/list box done, working on archive/delete)

🚫 BLOCKERS
- Waiting for C3 Convex schema to finalize mutations (CC9)
- Need C4 message mutations before CC5/CC6 can wire UI

⏭️ NEXT
- CC7: Caddy config (independent, can do anytime)
- CC8: Docs (last, after everything working)
```

---

## 🔗 Cross-Team Sync Points

**C1 Output → CC1 Input:**
- Codex defines email JSON structure
- Claude Code uses it for local storage format

**C3 + C4 → CC9:**
- Codex builds Convex schema
- Claude Code fills in attachment handlers using schema

**C4 → CC2, CC5, CC6:**
- Codex defines mutations/queries
- Claude Code calls them from CLI, TUI, web

**C6, C7 → CC4:**
- Codex builds routes + components
- Claude Code wires them into app.tsx

**CC1 → C5:**
- Claude Code defines local storage paths
- Codex references them in install script

---

## 🚀 Execution Timeline (Ideal)

```
Hours 0-6:   Phase 0A (Foundation)
  - C1: Listening loop
  - C3: Schema
  - CC1: Storage writer
  
Hours 6-12:  Phase 0B (Core Logic)
  - C2: Gateway (needs C1)
  - C4: Queries (needs C3)
  - CC2: CLI (needs C4)
  - CC3: TUI (needs C4)
  - CC9: Attachment handlers (needs C3, CC1)
  
Hours 12-18: Phase 0C (Web)
  - CC4: Web setup
  - C6: Routes (needs C4)
  - C7: Components (needs C4)
  - CC5: Attachment UI (needs C4)
  - CC6: Box management (needs C4)
  
Hours 18-24: Phase 0D (Infra + Polish)
  - C5: Install script
  - CC7: Caddy config
  - CC8: Docs
  - Full integration tests
  - Launch daemon
  
Total: ~24 hours for scrappy Phase 0
```

---

## 🧪 Testing Checklist

**As you go (don't wait for the end):**
- [ ] C1: Test `resend emails receiving listen --to test@domain.tld` manually
- [ ] C3: `convex schema` validates without errors
- [ ] CC1: Run C1 output through CC1, verify MSG.md created
- [ ] C4: Insert test message via mutation, query it back
- [ ] CC2: Test `resendld box add test@example.com` (reads/writes boxes.json)
- [ ] CC4: `bun run dev` starts server on localhost:3000
- [ ] C6: Routes load without 404s
- [ ] C7: Components render (no TS errors)
- [ ] CC7: `curl https://resendld.localhost` → 200 (SSL works)
- [ ] Integration: End-to-end email receive → display in web UI

**Final (before declaring done):**
- [ ] `bash scripts/install.sh` completes without errors
- [ ] `resendld start` launches daemon + logs appear
- [ ] Send test email to configured box
- [ ] Email appears in web UI within 5 seconds
- [ ] Click email, see full content + attachments
- [ ] Reply to email works
- [ ] Archive/delete/spam work
- [ ] `resendld stop` stops daemon cleanly

---

## 💡 Pro Tips

1. **Commit often.** After each small working piece, `git commit`. Makes debugging easier.

2. **Use bun for testing.** `bun run` scripts are fast. Test TypeScript before compiling.

3. **Assume JSON messages.** Email from C1 is a JSON object:
   ```json
   {
     "from": "...",
     "to": [...],
     "subject": "...",
     "body": "...",
     "attachments": [
       { "filename": "...", "data": "base64..." }
     ]
   }
   ```

4. **Convex local dev.** Run `npx convex dev` in `web/` — uses local SQLite, no auth needed.

5. **Glass design system.** Check docs at glass-design-system npm — use components not raw Tailwind.

6. **Phosphor icons.** Lightweight (light weight variant). Use `<Mail />` not `<MailIcon />`.

---

## ❓ Questions?

- Check PROJECT_PLAN.md for architecture
- Check AGENT_ASSIGNMENTS.md for detailed task specs
- Ask Michael if you're blocked

---

## ✅ Ready?

Once both agents report "Phase 0A complete," kick off Phase 0B (parallel).

**Let's ship this.** 🚀
