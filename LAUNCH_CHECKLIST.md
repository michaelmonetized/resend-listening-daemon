# Resendld Phase 0 Launch Checklist

**Project:** Resend Listening Daemon  
**Status:** Ready to Spawn Sub-Agents  
**Target:** Single-shot delivery, 24-36 hours  
**Date:** 2026-03-23 10:47 EDT

---

## ✅ Pre-Launch Checks

- [x] Project root created: `~/Projects/resend-listening-daemon/`
- [x] Daemon script written: `src/resendld.sh`
- [x] Project plan documented: `PROJECT_PLAN.md`
- [x] Task assignments detailed: `AGENT_ASSIGNMENTS.md`
- [x] Agent quickstart written: `QUICKSTART.md`
- [x] Directory structure ready
- [x] Dependencies identified
- [x] Sub-agent org chart created

---

## 📋 Pre-Kickoff Validation

### Codex Agent
- [ ] Can read `PROJECT_PLAN.md` sections C1-C7
- [ ] Understands resend-cli fork location: `~/Projects/resend-cli`
- [ ] Has access to Convex pattern reference
- [ ] TanStack Router docs accessible
- [ ] Ready to start with C1 (no blockers)

### Claude Code Agent
- [ ] Can read `PROJECT_PLAN.md` sections CC1-CC9
- [ ] Understands local storage structure: `~/.openclaw/workspace/mail/inbox/`
- [ ] Has access to shadcn/ui + glass-design-system docs
- [ ] Knows Phosphor Icons (light weight variant)
- [ ] Ready to start with CC1 (no blockers)

### Both Teams
- [ ] Can read `QUICKSTART.md`
- [ ] Can read `AGENT_ASSIGNMENTS.md`
- [ ] Know daily standup format + timezone (EST)
- [ ] Understand cross-team sync points
- [ ] Know how to report blockers immediately

---

## 🚀 Spawn Instructions

### Spawn Codex (Backend + Core Logic)

```bash
sessions_spawn \
  runtime="subagent" \
  mode="run" \
  task="Build Resendld Phase 0 — Codex Tasks C1-C7

Read these files first (in order):
1. ~/Projects/resend-listening-daemon/PROJECT_PLAN.md (sections C1-C7)
2. ~/Projects/resend-listening-daemon/AGENT_ASSIGNMENTS.md (focus on C1-C7)
3. ~/Projects/resend-listening-daemon/QUICKSTART.md (Codex section)

Your Tasks:
C1: Resend listening loop (src/daemon/listen.ts)
C2: OpenClaw gateway delivery (src/daemon/gateway.ts)
C3: Convex schema + types (web/convex/schema.ts)
C4: Message queries/mutations (web/convex/messages.ts)
C5: Install script (scripts/install.sh)
C6: Web routes (web/src/routes/)
C7: Message components (web/src/components/)

Sequence: C1 → C3 → C2,C4 (parallel) → C5 → C6,C7 (parallel)

Key Dependency:
- Resend-cli fork: ~/Projects/resend-cli

Daily Reporting:
Post progress to Michael's Telegram at end of day:
✅ COMPLETED (what you finished + commit links)
🔧 IN PROGRESS (current task + %)
🚫 BLOCKERS (if any + what you need)
⏭️ NEXT (what's coming tomorrow)

Work Location: ~/Projects/resend-listening-daemon/
Timeline Target: 12-18 hours for Phase 0A+0B+0C
Do not over-engineer. Ship scrappy, make it work.
Full integration happens when both teams report Phase 0C done.

You have all tools needed: git, node, bun, TypeScript, everything.
Go." \
  model="openai-codex/gpt-5.4" \
  timeoutSeconds=7200
```

### Spawn Claude Code (Frontend + Infra)

```bash
sessions_spawn \
  runtime="subagent" \
  mode="run" \
  task="Build Resendld Phase 0 — Claude Code Tasks CC1-CC9

Read these files first (in order):
1. ~/Projects/resend-listening-daemon/PROJECT_PLAN.md (sections CC1-CC9)
2. ~/Projects/resend-listening-daemon/AGENT_ASSIGNMENTS.md (focus on CC1-CC9)
3. ~/Projects/resend-listening-daemon/QUICKSTART.md (Claude Code section)

Your Tasks:
CC1: Local file storage + MSG.md writer (src/daemon/storage.ts)
CC2: CLI commands (src/cli/commands.ts)
CC3: Terminal UI (src/tui/index.ts)
CC4: Web app setup (web/src/app.tsx + package.json)
CC5: Attachment UI components (web/src/components/AttachmentList.tsx)
CC6: Box management UI (web/src/routes/boxes.tsx + hooks)
CC7: Caddy SSL config (scripts/caddy/Caddyfile)
CC8: README + docs (after all else)
CC9: Convex attachment handlers (web/convex/attachments.ts)

Sequence: CC1 → CC4 → CC2,CC3,CC9 (parallel) → CC5,CC6 (parallel) → CC7 → CC8

Key Dependencies:
- Will wait for Codex's C3 (Convex schema) before CC9
- Will wait for Codex's C4 (mutations/queries) before CC2,CC5,CC6
- CC1 is independent, start there

Daily Reporting:
Post progress to Michael's Telegram at end of day:
✅ COMPLETED (what you finished + commit links)
🔧 IN PROGRESS (current task + %)
🚫 BLOCKERS (if any + what you need)
⏭️ NEXT (what's coming tomorrow)

Work Location: ~/Projects/resend-listening-daemon/
Timeline Target: 12-18 hours for Phase 0A+0B+0C+0D
Tech Stack: Bun, TanStack Start, Convex local, shadcn/ui, Phosphor Icons, Caddy
Do not over-engineer. Ship scrappy, make it work.
Full integration happens when both teams report Phase 0D done.

You have all tools needed: git, node, bun, TypeScript, everything.
Go." \
  model="anthropic/claude-opus-4-5" \
  timeoutSeconds=7200
```

---

## 📊 Success Metrics (Final)

After both agents complete Phase 0, verify:

- [ ] **Daemon runs:** `resendld start` launches without errors
- [ ] **Email received:** Send test email to configured box
- [ ] **Stored locally:** MSG.md appears in `~/.openclaw/workspace/mail/inbox/`
- [ ] **Convex stored:** Message queryable from Convex dashboard
- [ ] **Gateway notified:** OpenClaw receives email notification
- [ ] **Web UI loads:** `https://resendld.localhost` responds
- [ ] **Email displayed:** Email visible in web inbox
- [ ] **Detail view works:** Click email, see full content + attachments
- [ ] **Reply works:** Compose + send reply
- [ ] **Archive works:** Archive button removes from inbox
- [ ] **CLI works:** `resendld box list` shows configured boxes
- [ ] **TUI works:** Terminal UI launches, navigate emails
- [ ] **Install works:** `bash scripts/install.sh` completes without errors
- [ ] **SSL works:** Caddy certificate trusted, no browser warnings
- [ ] **Restart works:** Kill daemon, restart, verify auto-recovery

---

## 🎯 Post-Launch Actions

Once both agents report completion:

1. **Integration test** — Full end-to-end:
   - [ ] Daemon running
   - [ ] Send email → received → displayed → reply works → archived
   - [ ] Web UI responsive
   - [ ] No console errors

2. **Performance baseline** — Measure:
   - [ ] Email delivery latency (receive → display): <5s
   - [ ] Web UI load time: <2s
   - [ ] Database query time: <200ms

3. **Documentation review** — Check:
   - [ ] README complete + user-friendly
   - [ ] Installation instructions work from scratch
   - [ ] Troubleshooting covers common issues

4. **Deployment** — Setup:
   - [ ] Daemon auto-starts on system reboot
   - [ ] Logs rotate (don't fill disk)
   - [ ] Convex backups configured

---

## 🔗 Communication

### During Build (Both Teams)
- **Blocker alerts:** Post immediately to Telegram
- **Cross-team questions:** @mention in Telegram (don't block, solve async)
- **Daily standups:** End-of-day posts (18:00-22:00 EDT)

### Decision Points
- **Scope changes:** Ask Michael (don't add features, ship Phase 0 first)
- **Technical disagreements:** Michael decides, move on
- **Missing dependencies:** Try local solution first, ask Michael if stuck

### Success Signal
- Both agents report "Phase 0 complete"
- Michael runs full integration test
- Daemon runs stable for 1 hour with real emails

---

## 🚀 Ready to Launch?

### Codex Readiness
- [ ] Read PROJECT_PLAN.md + AGENT_ASSIGNMENTS.md
- [ ] Understand C1-C7 tasks
- [ ] Know daily reporting format
- [ ] Ready to code

### Claude Code Readiness
- [ ] Read PROJECT_PLAN.md + AGENT_ASSIGNMENTS.md
- [ ] Understand CC1-CC9 tasks
- [ ] Know daily reporting format
- [ ] Ready to code

### Michael's Sign-Off
- [ ] Reviewed this checklist
- [ ] Ready to receive daily standups
- [ ] Clear on escalation path (blockers → immediately)

---

## 🎯 Final Checklist Before Spawn

- [ ] resendld.sh written + executable
- [ ] PROJECT_PLAN.md complete + detailed
- [ ] AGENT_ASSIGNMENTS.md task specs clear
- [ ] QUICKSTART.md team-specific guides written
- [ ] Directory structure ready: src/, web/, scripts/
- [ ] Config example created: config/boxes.json.example
- [ ] Git repo initialized (or will be by agents)
- [ ] Codex understands Convex + TanStack
- [ ] Claude Code understands Bun + Caddy + shadcn/ui
- [ ] Both agents know Phase 0 = single-shot, no delays

---

## ✅ READY TO LAUNCH

**Status:** All prep complete. Sub-agents ready to spawn.

**Next Step:** Spawn Codex agent, then Claude Code agent.

**ETA:** 24-36 hours to Phase 0 complete.

**Go time.** 🚀
