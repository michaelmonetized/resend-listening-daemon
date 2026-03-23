/**
 * CC1: Local File Storage & Markdown Writer
 *
 * Stores emails as markdown files with YAML frontmatter:
 * ~/.openclaw/workspace/mail/inbox/{from}/{subject}-{date}/MSG.md
 *
 * Shells out to `echo` for reliable file writing
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Types
export interface EmailAttachment {
  filename: string;
  data?: string;
  url?: string;
  mimeType?: string;
  size?: number;
}

export interface ParsedEmail {
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string | null;
  attachments: EmailAttachment[];
  date: string;
}

interface StorageResult {
  success: boolean;
  path?: string;
  error?: string;
}

const MAIL_DIR = path.join(process.env.HOME || "", ".openclaw/workspace/mail/inbox");

// Sanitize filename
function sanitizeFilename(name: string | null | undefined): string {
  if (!name || typeof name !== "string") {
    return "unknown";
  }
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "")
    .trim()
    .slice(0, 100);
}

// Format date for path
function formatDateForPath(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split("T")[0];
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}-${hour}-${min}`;
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

// Extract email domain
function extractEmail(emailStr: string): string {
  const match = emailStr.match(/([^<>]+@[^<>]+)/);
  return match ? match[1].trim() : emailStr;
}

// Generate email folder path
function generateEmailPath(email: ParsedEmail): string {
  const fromEmail = extractEmail(email.from);
  const sanitizedFrom = sanitizeFilename(fromEmail);
  const sanitizedSubject = sanitizeFilename(email.subject);
  const dateStr = formatDateForPath(email.date);

  let folderName = `${sanitizedSubject}-${dateStr}`;
  let folderPath = path.join(MAIL_DIR, sanitizedFrom, folderName);

  // Handle duplicates
  let counter = 0;
  while (fs.existsSync(folderPath)) {
    counter++;
    folderName = `${sanitizedSubject}-${dateStr}-${counter}`;
    folderPath = path.join(MAIL_DIR, sanitizedFrom, folderName);
  }

  return folderPath;
}

// Escape string for shell echo
function escapeShellString(str: string): string {
  // Use $'...' syntax for ANSI-C quoting to handle special chars
  return "$'" + str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t") + "'";
}

// Build YAML frontmatter
function buildFrontmatter(email: ParsedEmail, attachmentPaths: string[]): string {
  const toList = email.to.map((t) => `  - ${t}`).join("\n");
  const ccList = email.cc && email.cc.length > 0 ? email.cc.map((c) => `  - ${c}`).join("\n") : "  []";
  const bccList = email.bcc && email.bcc.length > 0 ? email.bcc.map((b) => `  - ${b}`).join("\n") : "  []";

  let attachmentSection = "";
  if (attachmentPaths.length > 0) {
    attachmentSection = "attachments:\n" + attachmentPaths.map((p) => `  - ${p}`).join("\n") + "\n";
  }

  return `---
from: ${email.from}
to:
${toList}
cc:
${ccList}
bcc:
${bccList}
subject: ${email.subject}
date: ${email.date}
message_id: ${email.messageId}
${attachmentSection}---
`;
}

// Store message
export async function storeMessage(email: ParsedEmail): Promise<StorageResult> {
  try {
    const emailFolder = generateEmailPath(email);
    const msgPath = path.join(emailFolder, "MSG.md");

    // Create directory
    fs.mkdirSync(emailFolder, { recursive: true });

    console.log(`[CC1] Storing email: ${email.subject} → ${emailFolder}`);

    // Build markdown content
    const frontmatter = buildFrontmatter(email, []);
    const bodyContent = email.body || (email.bodyHtml ? stripHtml(email.bodyHtml) : "");

    const markdownContent = frontmatter + "\n" + bodyContent;

    // Write using echo + shell redirection
    try {
      execSync(`echo ${escapeShellString(markdownContent)} > ${escapeShellString(msgPath)}`, {
        encoding: "utf-8",
      });
      console.log(`[CC1] ✓ Saved: ${msgPath}`);
      return { success: true, path: msgPath };
    } catch (err) {
      console.error(`[CC1] Echo failed:`, err);
      // Fallback: try fs.writeFileSync
      fs.writeFileSync(msgPath, markdownContent, "utf-8");
      console.log(`[CC1] ✓ Saved (fallback): ${msgPath}`);
      return { success: true, path: msgPath };
    }
  } catch (err) {
    console.error(`[CC1] Failed to store message:`, err);
    return { success: false, error: String(err) };
  }
}

// Simple HTML to text conversion
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n\s*\n/g, "\n\n");
}
