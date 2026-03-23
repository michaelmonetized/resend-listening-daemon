# Architecture

## Overview

resendld is a local-first email system that:
1. Listens for incoming emails via Resend's receiving API
2. Stores messages locally as markdown files
3. Syncs to a Convex database for the web UI
4. Delivers notifications to OpenClaw gateway

```
┌─────────────────────────────────────────────────────────────────┐
│                         RESEND CLOUD                            │
│                                                                 │
│   user@domain.com → Resend Inbound → resend emails receiving   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ JSON stream
┌─────────────────────────────────────────────────────────────────┐
│                         DAEMON (resendld)                       │
│                                                                 │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    │
│   │ listen  │───▶│ storage │───▶│ convex  │───▶│ gateway │    │
│   │   .ts   │    │   .ts   │    │ client  │    │   .ts   │    │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘    │
│        │              │              │              │          │
│        │              ▼              │              ▼          │
│        │     ~/.openclaw/workspace   │       OpenClaw          │
│        │        /mail/inbox/         │       Gateway           │
│        │                             │                         │
└────────┼─────────────────────────────┼─────────────────────────┘
         │                             │
         ▼                             ▼
┌─────────────────────┐    ┌─────────────────────────────────────┐
│   LOCAL STORAGE     │    │            CONVEX                   │
│                     │    │                                     │
│  inbox/             │    │  Tables:                           │
│   ├─ sender@.../    │    │   ├─ messages                      │
│   │   └─ Subject/   │    │   ├─ attachments                   │
│   │       ├─ MSG.md │    │   └─ boxes                         │
│   │       └─ att/   │    │                                     │
│   └─ ...            │    │  Real-time subscriptions           │
└─────────────────────┘    └─────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                          WEB UI                                 │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │  TanStack Start + Router                                 │ │
│   │                                                          │ │
│   │  ┌────────┐  ┌────────────┐  ┌─────────────────────────┐│ │
│   │  │ Inbox  │  │ Message    │  │ Box Management          ││ │
│   │  │ View   │  │ Detail     │  │                         ││ │
│   │  └────────┘  └────────────┘  └─────────────────────────┘│ │
│   │                                                          │ │
│   │  Convex React Client ◄──── Real-time Updates            │ │
│   └──────────────────────────────────────────────────────────┘ │
│                              │                                 │
│                              ▼                                 │
│   ┌────────────────────────────────────────────────────────┐   │
│   │                   Caddy (SSL)                          │   │
│   │              resendld.localhost:443                    │   │
│   └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Daemon (src/)

The core daemon is a zsh script (`resendld.sh`) that:
- Manages lifecycle (start/stop/restart)
- Spawns listeners for each configured box
- Handles crashes with auto-restart

TypeScript modules:
- **listen.ts** - Connects to Resend's receiving API
- **storage.ts** - Writes emails to local markdown files
- **gateway.ts** - Delivers notifications to OpenClaw

### 2. Local Storage

Emails are stored as markdown files:

```
~/.openclaw/workspace/mail/inbox/
└── sender@example.com/
    └── Subject-2026-03-23-10-47/
        ├── MSG.md          # YAML frontmatter + body
        └── attachments/
            └── file.pdf
```

**MSG.md Format:**
```markdown
---
from: "Sender Name <sender@example.com>"
to:
  - "recipient@yourdomain.com"
subject: "Email Subject"
date: "2026-03-23T10:47:00Z"
messageId: "msg_1234567890"
attachments:
  - filename: "file.pdf"
    path: "~/.openclaw/workspace/mail/inbox/.../file.pdf"
    size: 12345
    mimeType: "application/pdf"
---

Email body content here.
```

### 3. Convex Backend (web/convex/)

Convex provides:
- **Real-time subscriptions** - UI updates automatically
- **Serverless functions** - No backend to manage
- **Local development** - Works offline with SQLite

Tables:
- **messages** - Email metadata and body
- **attachments** - Attachment metadata (paths to local files)
- **boxes** - Configured email addresses

### 4. Web UI (web/src/)

Built with:
- **TanStack Start** - Full-stack React framework
- **TanStack Router** - Type-safe routing
- **shadcn/ui** - Component library
- **Phosphor Icons** - Icon set
- **Convex React** - Real-time data binding

### 5. Caddy (scripts/caddy/)

Caddy provides:
- **HTTPS** - Self-signed certificate for localhost
- **Reverse proxy** - Routes to the web server
- **File server** - Serves attachments directly

## Data Flow

### Receiving Email

1. Email arrives at Resend for `user@domain.com`
2. Daemon's `listen.ts` receives JSON via streaming API
3. `storage.ts` writes MSG.md and downloads attachments
4. Convex mutation stores metadata
5. `gateway.ts` notifies OpenClaw

### Viewing Email

1. User opens `https://resendld.localhost`
2. Convex query fetches messages
3. TanStack Router renders inbox
4. User clicks message → detail view
5. Convex marks message as read

### Actions

1. User clicks Archive/Delete/Spam
2. Convex mutation updates database
3. UI updates via real-time subscription
4. (Delete) Local files remain until garbage collected

## Security

- **Local-only** - No external authentication required
- **Caddy SSL** - HTTPS even for localhost
- **No cloud storage** - All data stays on your machine
- **Convex local mode** - Database runs locally

## Performance

- **Streaming** - Emails received as they arrive
- **Real-time** - Convex pushes updates to all clients
- **Local storage** - Fast file system access
- **Indexed queries** - Convex indexes for fast filtering
