/**
 * CC2: CLI Command Implementations
 *
 * Commands:
 * - box add/list/remove
 * - archive/delete/spam MESSAGE_ID
 * - reply MESSAGE_ID --to ADDR --body "text"
 *
 * Uses Convex HTTP API for mutations (local dev mode)
 */

import * as fs from "fs";
import * as path from "path";

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Configuration
const CONFIG_DIR = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME!, ".config");
const BOXES_PATH = path.join(CONFIG_DIR, "resendld", "boxes.json");
const CONVEX_URL = process.env.CONVEX_URL || "http://localhost:3210";

interface Box {
  email: string;
  isActive: boolean;
  lastSync: string | null;
}

interface BoxConfig {
  boxes: Box[];
}

// Helper: Load boxes from config file
function loadBoxes(): BoxConfig {
  if (!fs.existsSync(BOXES_PATH)) {
    return { boxes: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(BOXES_PATH, "utf-8"));
  } catch {
    return { boxes: [] };
  }
}

// Helper: Save boxes to config file
function saveBoxes(config: BoxConfig): void {
  const dir = path.dirname(BOXES_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(BOXES_PATH, JSON.stringify(config, null, 2));
}

// Helper: Call Convex mutation via HTTP API
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
    const text = await response.text();
    throw new Error(`Convex error: ${text}`);
  }

  return response.json();
}

// Helper: Call Convex query via HTTP API
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
    const text = await response.text();
    throw new Error(`Convex error: ${text}`);
  }

  return response.json();
}

// Helper: Print table
function printTable(rows: string[][], headers: string[]): void {
  // Calculate column widths
  const widths = headers.map((h, i) => {
    const maxData = Math.max(...rows.map((r) => (r[i] || "").length));
    return Math.max(h.length, maxData);
  });

  // Print header
  const headerRow = headers.map((h, i) => h.padEnd(widths[i])).join("  ");
  console.log(`${colors.bold}${headerRow}${colors.reset}`);
  console.log(`${colors.dim}${"─".repeat(headerRow.length)}${colors.reset}`);

  // Print rows
  for (const row of rows) {
    const rowStr = row.map((cell, i) => (cell || "").padEnd(widths[i])).join("  ");
    console.log(rowStr);
  }
}

// ==================== BOX COMMANDS ====================

export async function handleBoxAdd(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error(`${colors.red}Error:${colors.reset} Email required`);
    console.log("Usage: resendld box add EMAIL");
    process.exit(1);
  }

  const email = args[0];

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error(`${colors.red}Error:${colors.reset} Invalid email format`);
    process.exit(1);
  }

  // Update local config
  const config = loadBoxes();
  const existing = config.boxes.find((b) => b.email === email);

  if (existing) {
    if (existing.isActive) {
      console.log(`${colors.yellow}Box ${email} already exists and is active${colors.reset}`);
      return;
    }
    existing.isActive = true;
    console.log(`${colors.green}✓${colors.reset} Reactivated box: ${colors.cyan}${email}${colors.reset}`);
  } else {
    config.boxes.push({
      email,
      isActive: true,
      lastSync: null,
    });
    console.log(`${colors.green}✓${colors.reset} Added box: ${colors.cyan}${email}${colors.reset}`);
  }

  saveBoxes(config);

  // Also add to Convex (if running)
  try {
    await callConvex("boxes:addBox", { email, isActive: true });
    console.log(`${colors.dim}  └─ Synced to Convex${colors.reset}`);
  } catch {
    console.log(`${colors.dim}  └─ Convex not running (will sync on start)${colors.reset}`);
  }

  console.log("");
  console.log(`${colors.dim}The daemon will now listen for emails on this address.${colors.reset}`);
  console.log(`${colors.dim}Restart the daemon if it's running: resendld restart${colors.reset}`);
}

export async function handleBoxList(): Promise<void> {
  const config = loadBoxes();

  if (config.boxes.length === 0) {
    console.log(`${colors.dim}No boxes configured${colors.reset}`);
    console.log("");
    console.log("Add a box: resendld box add EMAIL");
    return;
  }

  console.log(`${colors.bold}📮 Configured Email Boxes${colors.reset}`);
  console.log("");

  const rows = config.boxes.map((box) => [
    box.isActive ? `${colors.green}●${colors.reset}` : `${colors.dim}○${colors.reset}`,
    box.email,
    box.isActive ? "Active" : "Inactive",
    box.lastSync ? new Date(box.lastSync).toLocaleDateString() : "Never",
  ]);

  printTable(rows, ["", "Email", "Status", "Last Sync"]);

  console.log("");
  console.log(`${colors.dim}${config.boxes.length} box(es) configured${colors.reset}`);
}

export async function handleBoxRemove(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error(`${colors.red}Error:${colors.reset} Email required`);
    console.log("Usage: resendld box remove EMAIL");
    process.exit(1);
  }

  const email = args[0];
  const config = loadBoxes();
  const index = config.boxes.findIndex((b) => b.email === email);

  if (index === -1) {
    console.error(`${colors.red}Error:${colors.reset} Box not found: ${email}`);
    process.exit(1);
  }

  config.boxes.splice(index, 1);
  saveBoxes(config);

  console.log(`${colors.green}✓${colors.reset} Removed box: ${colors.cyan}${email}${colors.reset}`);

  // Also remove from Convex
  try {
    await callConvex("boxes:removeBox", { email });
    console.log(`${colors.dim}  └─ Removed from Convex${colors.reset}`);
  } catch {
    console.log(`${colors.dim}  └─ Convex not running${colors.reset}`);
  }
}

// ==================== MESSAGE COMMANDS ====================

export async function handleArchive(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error(`${colors.red}Error:${colors.reset} Message ID required`);
    console.log("Usage: resendld archive MESSAGE_ID");
    process.exit(1);
  }

  const messageId = args[0];

  try {
    await callConvex("messages:archiveMessage", { messageId });
    console.log(`${colors.green}✓${colors.reset} Archived message: ${colors.cyan}${messageId}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export async function handleDelete(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error(`${colors.red}Error:${colors.reset} Message ID required`);
    console.log("Usage: resendld delete MESSAGE_ID");
    process.exit(1);
  }

  const messageId = args[0];

  try {
    await callConvex("messages:deleteMessage", { messageId });
    console.log(`${colors.green}✓${colors.reset} Deleted message: ${colors.cyan}${messageId}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export async function handleSpam(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error(`${colors.red}Error:${colors.reset} Message ID required`);
    console.log("Usage: resendld spam MESSAGE_ID");
    process.exit(1);
  }

  const messageId = args[0];

  try {
    await callConvex("messages:markAsSpam", { messageId });
    console.log(`${colors.green}✓${colors.reset} Marked as spam: ${colors.cyan}${messageId}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export async function handleReply(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error(`${colors.red}Error:${colors.reset} Message ID required`);
    console.log("Usage: resendld reply MESSAGE_ID --to ADDR --body \"text\"");
    process.exit(1);
  }

  const messageId = args[0];
  let to: string | null = null;
  let body: string | null = null;

  // Parse arguments
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--to" && args[i + 1]) {
      to = args[++i];
    } else if (args[i] === "--body" && args[i + 1]) {
      body = args[++i];
    }
  }

  if (!to) {
    console.error(`${colors.red}Error:${colors.reset} --to ADDR required`);
    process.exit(1);
  }

  if (!body) {
    console.error(`${colors.red}Error:${colors.reset} --body \"text\" required`);
    process.exit(1);
  }

  // Get original message to find the sender
  try {
    const message = (await queryConvex("messages:getMessage", { messageId })) as {
      from: string;
      subject: string;
    } | null;

    if (!message) {
      console.error(`${colors.red}Error:${colors.reset} Message not found: ${messageId}`);
      process.exit(1);
    }

    console.log(`${colors.cyan}Replying to:${colors.reset} ${message.subject}`);
    console.log(`${colors.cyan}To:${colors.reset} ${to}`);
    console.log(`${colors.cyan}Body:${colors.reset} ${body.slice(0, 100)}${body.length > 100 ? "..." : ""}`);
    console.log("");

    // TODO: Actually send the email via Resend API
    // For now, just log the intent
    console.log(`${colors.yellow}⚠${colors.reset} Reply sending not yet implemented`);
    console.log(`${colors.dim}This would call: resend emails send --to ${to} --subject "Re: ${message.subject}" --body "${body}"${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// ==================== HELP ====================

export function showHelp(): void {
  console.log(`
${colors.bold}📧 resendld - Resend Email Listening Daemon${colors.reset}

${colors.bold}USAGE${colors.reset}
  resendld <command> [options]

${colors.bold}COMMANDS${colors.reset}
  ${colors.cyan}start${colors.reset}                 Start the daemon
  ${colors.cyan}stop${colors.reset}                  Stop the daemon
  ${colors.cyan}restart${colors.reset}               Restart the daemon
  ${colors.cyan}status${colors.reset}                Show daemon status
  ${colors.cyan}logs${colors.reset}                  Show daemon logs

${colors.bold}BOX MANAGEMENT${colors.reset}
  ${colors.cyan}box add${colors.reset} EMAIL         Add an email box to monitor
  ${colors.cyan}box list${colors.reset}              List configured boxes
  ${colors.cyan}box remove${colors.reset} EMAIL      Remove an email box

${colors.bold}MESSAGE ACTIONS${colors.reset}
  ${colors.cyan}archive${colors.reset} MESSAGE_ID    Archive a message
  ${colors.cyan}delete${colors.reset} MESSAGE_ID     Delete a message
  ${colors.cyan}spam${colors.reset} MESSAGE_ID       Mark message as spam
  ${colors.cyan}reply${colors.reset} MESSAGE_ID      Reply to a message
    --to ADDR             Recipient email
    --body "text"         Reply body

${colors.bold}OPTIONS${colors.reset}
  ${colors.cyan}--help, -h${colors.reset}            Show this help
  ${colors.cyan}--version, -v${colors.reset}         Show version

${colors.bold}EXAMPLES${colors.reset}
  resendld box add support@myapp.com
  resendld start
  resendld archive msg_abc123
  resendld reply msg_abc123 --to user@example.com --body "Thanks!"

${colors.bold}WEB UI${colors.reset}
  Once running, visit: ${colors.cyan}https://resendld.localhost${colors.reset}
`);
}
