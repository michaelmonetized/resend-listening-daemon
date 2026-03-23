#!/usr/bin/env bun
/**
 * CC3: Terminal UI
 *
 * Interactive inbox browser with keyboard navigation.
 * Uses ink (React for CLI) for the UI.
 *
 * Features:
 * - Arrow keys to navigate
 * - Enter to view message
 * - a (archive), d (delete), s (spam), r (reply), q (quit)
 * - Auto-refresh on new emails
 *
 * Usage:
 *   bun src/tui/index.ts
 *   # or via CLI:
 *   resendld tui
 */

// Note: This is a simplified TUI that works with blessed
// In production, use ink for a more React-like experience

import * as readline from "readline";

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  inverse: "\x1b[7m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgBlue: "\x1b[44m",
  bgGray: "\x1b[100m",
};

// Configuration
const CONVEX_URL = process.env.CONVEX_URL || "http://localhost:3210";

interface Message {
  _id: string;
  messageId: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isSpam: boolean;
  attachments: Array<{
    filename: string;
    filepath: string;
    size: number;
    mimeType: string;
  }>;
}

interface TUIState {
  messages: Message[];
  selectedIndex: number;
  view: "list" | "detail";
  loading: boolean;
  error: string | null;
}

// Query Convex
async function queryConvex(
  functionName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const response = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: functionName,
      args,
    }),
  });

  if (!response.ok) {
    throw new Error(`Convex error: ${await response.text()}`);
  }

  return response.json();
}

// Mutation
async function callConvex(
  functionName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const response = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: functionName,
      args,
    }),
  });

  if (!response.ok) {
    throw new Error(`Convex error: ${await response.text()}`);
  }

  return response.json();
}

// Format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

// Format sender
function formatSender(from: string, maxLen = 20): string {
  const match = from.match(/^(.+?)\s*<[^>]+>$/);
  const name = match ? match[1].trim() : from.split("@")[0];
  return name.length > maxLen ? name.slice(0, maxLen - 1) + "…" : name.padEnd(maxLen);
}

// Clear screen
function clearScreen(): void {
  process.stdout.write("\x1b[2J\x1b[H");
}

// Move cursor
function moveCursor(row: number, col: number): void {
  process.stdout.write(`\x1b[${row};${col}H`);
}

// Get terminal size
function getTerminalSize(): { rows: number; cols: number } {
  return {
    rows: process.stdout.rows || 24,
    cols: process.stdout.columns || 80,
  };
}

// Render list view
function renderListView(state: TUIState): void {
  const { rows, cols } = getTerminalSize();
  clearScreen();

  // Header
  console.log(`${colors.bgBlue}${colors.white}${colors.bold} 📧 resendld inbox ${"".padEnd(cols - 20)}${colors.reset}`);
  console.log(`${colors.dim}${"─".repeat(cols)}${colors.reset}`);

  if (state.loading) {
    console.log("");
    console.log(`${colors.dim}Loading messages...${colors.reset}`);
    return;
  }

  if (state.error) {
    console.log("");
    console.log(`${colors.red}Error: ${state.error}${colors.reset}`);
    console.log(`${colors.dim}Press 'r' to retry, 'q' to quit${colors.reset}`);
    return;
  }

  if (state.messages.length === 0) {
    console.log("");
    console.log(`${colors.dim}No messages${colors.reset}`);
    console.log(`${colors.dim}Press 'q' to quit${colors.reset}`);
    return;
  }

  // Calculate visible messages
  const headerRows = 3; // Header + divider + status bar
  const footerRows = 2;
  const visibleRows = rows - headerRows - footerRows;

  // Determine scroll offset
  let startIdx = 0;
  if (state.selectedIndex >= visibleRows) {
    startIdx = state.selectedIndex - visibleRows + 1;
  }

  // Message list
  for (let i = 0; i < visibleRows && startIdx + i < state.messages.length; i++) {
    const idx = startIdx + i;
    const msg = state.messages[idx];
    const isSelected = idx === state.selectedIndex;

    // Build row
    const unreadMarker = msg.isRead ? " " : colors.cyan + "●" + colors.reset;
    const starMarker = msg.isStarred ? colors.yellow + "★" + colors.reset : " ";
    const attachMarker = msg.attachments?.length > 0 ? "📎" : "  ";
    const sender = formatSender(msg.from);
    const subject = msg.subject.slice(0, cols - 50).padEnd(cols - 50);
    const date = formatDate(msg.date);

    const row = `${unreadMarker} ${starMarker} ${sender} ${subject} ${attachMarker} ${date}`;

    if (isSelected) {
      console.log(`${colors.inverse}${row}${colors.reset}`);
    } else {
      console.log(row);
    }
  }

  // Fill remaining space
  const rendered = Math.min(visibleRows, state.messages.length - startIdx);
  for (let i = rendered; i < visibleRows; i++) {
    console.log("");
  }

  // Status bar
  console.log(`${colors.dim}${"─".repeat(cols)}${colors.reset}`);
  console.log(
    `${colors.dim}[↑↓] Navigate  [Enter] View  [a]rchive  [d]elete  [s]pam  [r]efresh  [q]uit  ${state.selectedIndex + 1}/${state.messages.length}${colors.reset}`
  );
}

// Render detail view
function renderDetailView(state: TUIState): void {
  const { cols } = getTerminalSize();
  const msg = state.messages[state.selectedIndex];

  clearScreen();

  // Header
  console.log(`${colors.bgBlue}${colors.white}${colors.bold} 📧 Message Detail ${"".padEnd(cols - 20)}${colors.reset}`);
  console.log(`${colors.dim}${"─".repeat(cols)}${colors.reset}`);
  console.log("");

  // Metadata
  console.log(`${colors.cyan}From:${colors.reset}    ${msg.from}`);
  console.log(`${colors.cyan}To:${colors.reset}      ${msg.to.join(", ")}`);
  console.log(`${colors.cyan}Subject:${colors.reset} ${msg.subject}`);
  console.log(`${colors.cyan}Date:${colors.reset}    ${new Date(msg.date).toLocaleString()}`);

  if (msg.attachments?.length > 0) {
    console.log(`${colors.cyan}Attach:${colors.reset}  ${msg.attachments.map((a) => a.filename).join(", ")}`);
  }

  console.log("");
  console.log(`${colors.dim}${"─".repeat(cols)}${colors.reset}`);
  console.log("");

  // Body
  const lines = msg.body.split("\n");
  for (const line of lines.slice(0, 20)) {
    console.log(line);
  }
  if (lines.length > 20) {
    console.log(`${colors.dim}... (${lines.length - 20} more lines)${colors.reset}`);
  }

  console.log("");
  console.log(`${colors.dim}${"─".repeat(cols)}${colors.reset}`);
  console.log(
    `${colors.dim}[Backspace/Esc] Back  [a]rchive  [d]elete  [s]pam  [r]eply  [q]uit${colors.reset}`
  );
}

// Main TUI loop
async function runTUI(): Promise<void> {
  const state: TUIState = {
    messages: [],
    selectedIndex: 0,
    view: "list",
    loading: true,
    error: null,
  };

  // Load messages
  async function loadMessages(): Promise<void> {
    state.loading = true;
    state.error = null;
    render();

    try {
      const result = (await queryConvex("messages:getMessages", { limit: 100 })) as {
        messages: Message[];
      };
      state.messages = result.messages || [];
      state.loading = false;

      // Mark first message as read if viewing
      if (state.messages.length > 0 && !state.messages[0].isRead) {
        await callConvex("messages:markAsRead", { messageId: state.messages[0].messageId });
      }
    } catch (err) {
      state.loading = false;
      state.error = err instanceof Error ? err.message : "Failed to load messages";
    }

    render();
  }

  // Render current view
  function render(): void {
    if (state.view === "list") {
      renderListView(state);
    } else {
      renderDetailView(state);
    }
  }

  // Set up readline for key input
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  // Handle key presses
  process.stdin.on("keypress", async (str, key) => {
    if (!key) return;

    // Quit
    if (key.name === "q" || (key.ctrl && key.name === "c")) {
      clearScreen();
      process.exit(0);
    }

    if (state.view === "list") {
      // List view controls
      switch (key.name) {
        case "up":
          if (state.selectedIndex > 0) {
            state.selectedIndex--;
            render();
          }
          break;

        case "down":
          if (state.selectedIndex < state.messages.length - 1) {
            state.selectedIndex++;
            render();
          }
          break;

        case "return":
          if (state.messages.length > 0) {
            state.view = "detail";
            // Mark as read
            const msg = state.messages[state.selectedIndex];
            if (!msg.isRead) {
              await callConvex("messages:markAsRead", { messageId: msg.messageId });
              msg.isRead = true;
            }
            render();
          }
          break;

        case "a":
          if (state.messages.length > 0) {
            const msg = state.messages[state.selectedIndex];
            await callConvex("messages:archiveMessage", { messageId: msg.messageId });
            state.messages.splice(state.selectedIndex, 1);
            if (state.selectedIndex >= state.messages.length) {
              state.selectedIndex = Math.max(0, state.messages.length - 1);
            }
            render();
          }
          break;

        case "d":
          if (state.messages.length > 0) {
            const msg = state.messages[state.selectedIndex];
            await callConvex("messages:deleteMessage", { messageId: msg.messageId });
            state.messages.splice(state.selectedIndex, 1);
            if (state.selectedIndex >= state.messages.length) {
              state.selectedIndex = Math.max(0, state.messages.length - 1);
            }
            render();
          }
          break;

        case "s":
          if (state.messages.length > 0) {
            const msg = state.messages[state.selectedIndex];
            await callConvex("messages:markAsSpam", { messageId: msg.messageId });
            state.messages.splice(state.selectedIndex, 1);
            if (state.selectedIndex >= state.messages.length) {
              state.selectedIndex = Math.max(0, state.messages.length - 1);
            }
            render();
          }
          break;

        case "r":
          await loadMessages();
          break;
      }
    } else {
      // Detail view controls
      switch (key.name) {
        case "backspace":
        case "escape":
          state.view = "list";
          render();
          break;

        case "a":
          const msg = state.messages[state.selectedIndex];
          await callConvex("messages:archiveMessage", { messageId: msg.messageId });
          state.messages.splice(state.selectedIndex, 1);
          if (state.selectedIndex >= state.messages.length) {
            state.selectedIndex = Math.max(0, state.messages.length - 1);
          }
          state.view = "list";
          render();
          break;

        case "d":
          const msgD = state.messages[state.selectedIndex];
          await callConvex("messages:deleteMessage", { messageId: msgD.messageId });
          state.messages.splice(state.selectedIndex, 1);
          if (state.selectedIndex >= state.messages.length) {
            state.selectedIndex = Math.max(0, state.messages.length - 1);
          }
          state.view = "list";
          render();
          break;

        case "s":
          const msgS = state.messages[state.selectedIndex];
          await callConvex("messages:markAsSpam", { messageId: msgS.messageId });
          state.messages.splice(state.selectedIndex, 1);
          if (state.selectedIndex >= state.messages.length) {
            state.selectedIndex = Math.max(0, state.messages.length - 1);
          }
          state.view = "list";
          render();
          break;

        case "r":
          // TODO: Open reply dialog
          console.log("\n\nReply not yet implemented. Press any key to continue.");
          break;
      }
    }
  });

  // Initial load
  await loadMessages();

  // Auto-refresh every 30 seconds
  setInterval(async () => {
    if (state.view === "list") {
      await loadMessages();
    }
  }, 30000);
}

// Entry point
console.log("Starting resendld TUI...");
console.log("Press Ctrl+C or 'q' to quit.");

runTUI().catch((err) => {
  console.error("TUI error:", err);
  process.exit(1);
});
