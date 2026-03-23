# Web UI Guide

## Overview

The resendld web UI provides a modern email interface for managing your inbox. It's built with TanStack Start, Convex, and shadcn/ui.

**URL:** [https://resendld.localhost](https://resendld.localhost)

## Features

### Inbox View

The main inbox shows all incoming emails with:
- **Unread indicator** - Blue dot for unread messages
- **Sender** - Name or email address
- **Subject** - Email subject line
- **Preview** - First 100 characters of the body
- **Attachment indicator** - 📎 if the message has attachments
- **Date** - Relative time (e.g., "5 min ago")

Click any message to view it in detail.

### Message Detail

The detail view shows the full email:
- **Header** - From, To, Cc, Subject, Date
- **Body** - Plain text or rendered HTML
- **Attachments** - Download or preview

**Actions:**
- ⭐ **Star** - Mark important messages
- 📦 **Archive** - Move to archive
- 🚫 **Spam** - Mark as spam
- 🗑️ **Delete** - Permanently delete
- ↩️ **Reply** - Open reply composer

### Attachments

Attachments are displayed with:
- **Filename** and **size**
- **MIME type** with appropriate icon
- **Download button** - Click to download
- **Preview** - Inline preview for images

### Manage Boxes

The Boxes page (`/boxes`) lets you:
- **Add new boxes** - Enter email and click "Add Box"
- **View all boxes** - See status and message count
- **Toggle active** - Enable/disable listening
- **Remove boxes** - Remove from configuration

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `↓` | Next message |
| `k` / `↑` | Previous message |
| `Enter` | Open message |
| `Esc` | Go back |
| `a` | Archive |
| `d` | Delete |
| `s` | Mark as spam |
| `r` | Reply |
| `?` | Show shortcuts |

## Themes

The UI uses a dark theme by default. The design follows shadcn/ui conventions with:
- Glass morphism effects
- Phosphor icons
- Smooth transitions
- Responsive layout

## Mobile Support

The UI is fully responsive:
- Sidebar collapses on mobile
- Touch-friendly buttons
- Swipe gestures (coming soon)

## Offline Support

The web UI requires a connection to the Convex backend. If the connection is lost:
- A banner will appear at the top
- Messages already loaded remain visible
- Actions are queued until reconnection

## Real-time Updates

New emails appear automatically without refreshing. The Convex backend pushes updates in real-time.

## Troubleshooting

### Page won't load

1. Check if Caddy is running: `caddy status`
2. Check if Convex is running: `curl http://localhost:3210`
3. Check the browser console for errors

### Messages not appearing

1. Verify the daemon is running: `resendld status`
2. Check daemon logs: `resendld logs`
3. Verify the box is active: `resendld box list`

### SSL Certificate Warning

If your browser warns about the certificate:
1. Run `sudo caddy trust` to trust the CA
2. Restart your browser
3. The warning should not appear again
