/**
 * CC1: Local File Storage & Markdown Writer
 *
 * Stores emails as markdown files with YAML frontmatter:
 * ~/.openclaw/workspace/mail/inbox/{from}/{subject}-{date}/MSG.md
 *
 * Downloads attachments to:
 * ~/.openclaw/workspace/mail/inbox/{from}/{subject}-{date}/attachments/{filename}
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

// Types matching listen.ts
export interface EmailAttachment {
  filename: string;
  data?: string; // base64 encoded
  url?: string; // URL to download from
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
  bodyHtml?: string;
  date: string;
  attachments: EmailAttachment[];
}

export interface StoredAttachment {
  filename: string;
  filepath: string;
  size: number;
  mimeType: string;
}

export interface StorageResult {
  success: boolean;
  msgPath: string;
  attachments: StoredAttachment[];
  error?: string;
}

// Configuration
const MAIL_DIR =
  process.env.OPENCLAW_MAIL_DIR ||
  path.join(process.env.HOME || "", ".openclaw", "workspace", "mail", "inbox");

/**
 * Sanitize a string for use in file/folder names
 * Removes/replaces unsafe characters
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_") // Replace unsafe chars
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\.+$/g, "") // Remove trailing dots
    .trim()
    .slice(0, 100); // Limit length
}

/**
 * Extract email address from "Name <email@domain.com>" format
 */
function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from;
}

/**
 * Format date string for folder names: YYYY-MM-DD-HH-mm
 */
function formatDateForPath(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Fallback to current time if date is invalid
      return formatDateForPath(new Date().toISOString());
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}-${hour}-${min}`;
  } catch {
    return formatDateForPath(new Date().toISOString());
  }
}

/**
 * Generate a unique folder path for an email
 * Handles duplicate subjects by appending timestamp
 */
function generateEmailPath(email: ParsedEmail): string {
  const fromEmail = extractEmail(email.from);
  const sanitizedFrom = sanitizeFilename(fromEmail);
  const sanitizedSubject = sanitizeFilename(email.subject || "no-subject");
  const dateStr = formatDateForPath(email.date);

  let folderName = `${sanitizedSubject}-${dateStr}`;
  let folderPath = path.join(MAIL_DIR, sanitizedFrom, folderName);

  // Handle duplicates by appending timestamp
  let counter = 0;
  while (fs.existsSync(folderPath)) {
    counter++;
    folderName = `${sanitizedSubject}-${dateStr}-${counter}`;
    folderPath = path.join(MAIL_DIR, sanitizedFrom, folderName);
  }

  return folderPath;
}

/**
 * Generate YAML frontmatter from email data
 */
function generateFrontmatter(
  email: ParsedEmail,
  storedAttachments: StoredAttachment[]
): string {
  const fm: Record<string, unknown> = {
    from: email.from,
    to: email.to,
    subject: email.subject,
    date: email.date,
    messageId: email.messageId,
  };

  if (email.cc && email.cc.length > 0) {
    fm.cc = email.cc;
  }

  if (email.bcc && email.bcc.length > 0) {
    fm.bcc = email.bcc;
  }

  if (storedAttachments.length > 0) {
    fm.attachments = storedAttachments.map((att) => ({
      filename: att.filename,
      path: att.filepath,
      size: att.size,
      mimeType: att.mimeType,
    }));
  }

  // Simple YAML serialization (avoid external dependency)
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(fm)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        if (typeof item === "object") {
          // Attachment objects
          lines.push(`  - filename: "${escapeYaml(item.filename)}"`);
          lines.push(`    path: "${escapeYaml(item.path)}"`);
          lines.push(`    size: ${item.size}`);
          lines.push(`    mimeType: "${escapeYaml(item.mimeType)}"`);
        } else {
          lines.push(`  - "${escapeYaml(String(item))}"`);
        }
      }
    } else {
      lines.push(`${key}: "${escapeYaml(String(value))}"`);
    }
  }
  lines.push("---");

  return lines.join("\n");
}

/**
 * Escape special characters for YAML strings
 */
function escapeYaml(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

/**
 * Download attachment from URL
 */
async function downloadFromUrl(url: string, destPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    const file = fs.createWriteStream(destPath);
    protocol
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Handle redirects
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            file.close();
            fs.unlinkSync(destPath);
            downloadFromUrl(redirectUrl, destPath).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destPath);
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        let size = 0;
        response.on("data", (chunk) => {
          size += chunk.length;
        });

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          resolve(size);
        });
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
        reject(err);
      });
  });
}

/**
 * Save attachment to disk
 * Supports both base64 data and URL downloads
 */
async function saveAttachment(
  attachment: EmailAttachment,
  attachmentsDir: string
): Promise<StoredAttachment | null> {
  const sanitizedFilename = sanitizeFilename(
    attachment.filename || "unnamed-attachment"
  );
  const destPath = path.join(attachmentsDir, sanitizedFilename);

  try {
    fs.mkdirSync(attachmentsDir, { recursive: true });

    let size = 0;

    if (attachment.data) {
      // Base64 encoded data
      const buffer = Buffer.from(attachment.data, "base64");
      fs.writeFileSync(destPath, buffer);
      size = buffer.length;
    } else if (attachment.url) {
      // Download from URL
      size = await downloadFromUrl(attachment.url, destPath);
    } else {
      console.warn(`[CC1] Attachment has no data or URL: ${attachment.filename}`);
      return null;
    }

    return {
      filename: sanitizedFilename,
      filepath: destPath,
      size: attachment.size || size,
      mimeType: attachment.mimeType || guessMimeType(sanitizedFilename),
    };
  } catch (err) {
    console.error(`[CC1] Failed to save attachment ${attachment.filename}:`, err);
    return null;
  }
}

/**
 * Guess MIME type from filename extension
 */
function guessMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx":
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".xml": "application/xml",
    ".zip": "application/zip",
    ".gz": "application/gzip",
    ".tar": "application/x-tar",
    ".rar": "application/vnd.rar",
    ".7z": "application/x-7z-compressed",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".eml": "message/rfc822",
  };

  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Store an email locally as MSG.md with attachments
 *
 * @param email - Parsed email data from listen.ts
 * @returns StorageResult with paths and attachment info
 */
export async function storeMessage(email: ParsedEmail): Promise<StorageResult> {
  try {
    // Generate unique folder path
    const emailFolder = generateEmailPath(email);
    const msgPath = path.join(emailFolder, "MSG.md");
    const attachmentsDir = path.join(emailFolder, "attachments");

    // Create directories
    fs.mkdirSync(emailFolder, { recursive: true });

    console.log(`[CC1] Storing email: ${email.subject} → ${emailFolder}`);

    // Download and store attachments
    const storedAttachments: StoredAttachment[] = [];

    if (email.attachments && email.attachments.length > 0) {
      console.log(`[CC1] Processing ${email.attachments.length} attachment(s)...`);

      for (const attachment of email.attachments) {
        const stored = await saveAttachment(attachment, attachmentsDir);
        if (stored) {
          storedAttachments.push(stored);
          console.log(`[CC1] ✓ Saved: ${stored.filename} (${stored.size} bytes)`);
        }
      }
    }

    // Generate frontmatter
    const frontmatter = generateFrontmatter(email, storedAttachments);

    // Determine body content (prefer plain text, fallback to HTML)
    let bodyContent = email.body || "";
    if (!bodyContent && email.bodyHtml) {
      // Simple HTML to text conversion (basic)
      bodyContent = email.bodyHtml
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .trim();
    }

    // Compose MSG.md
    const msgContent = `${frontmatter}

${bodyContent}
`;

    // Write MSG.md
    fs.writeFileSync(msgPath, msgContent, "utf-8");

    console.log(`[CC1] ✓ Message stored: ${msgPath}`);

    return {
      success: true,
      msgPath,
      attachments: storedAttachments,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[CC1] Failed to store message:`, errorMessage);

    return {
      success: false,
      msgPath: "",
      attachments: [],
      error: errorMessage,
    };
  }
}

/**
 * Get the mail inbox directory
 */
export function getMailDir(): string {
  return MAIL_DIR;
}

/**
 * List all stored emails (for sync/recovery)
 */
export function listStoredEmails(): string[] {
  const emails: string[] = [];

  if (!fs.existsSync(MAIL_DIR)) {
    return emails;
  }

  const senders = fs.readdirSync(MAIL_DIR, { withFileTypes: true });

  for (const sender of senders) {
    if (!sender.isDirectory()) continue;

    const senderPath = path.join(MAIL_DIR, sender.name);
    const messages = fs.readdirSync(senderPath, { withFileTypes: true });

    for (const msg of messages) {
      if (!msg.isDirectory()) continue;

      const msgPath = path.join(senderPath, msg.name, "MSG.md");
      if (fs.existsSync(msgPath)) {
        emails.push(msgPath);
      }
    }
  }

  return emails;
}

/**
 * Parse a stored MSG.md file back into email data
 */
export function parseStoredMessage(msgPath: string): ParsedEmail | null {
  try {
    const content = fs.readFileSync(msgPath, "utf-8");

    // Extract frontmatter
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) {
      console.warn(`[CC1] Invalid MSG.md format: ${msgPath}`);
      return null;
    }

    const frontmatter = fmMatch[1];
    const body = fmMatch[2].trim();

    // Parse YAML frontmatter (simple parser)
    const data: Record<string, unknown> = {};
    let currentKey = "";
    let currentArray: unknown[] = [];
    let inArray = false;
    let inAttachment = false;
    let currentAttachment: Record<string, unknown> = {};

    for (const line of frontmatter.split("\n")) {
      if (line.startsWith("  - filename:")) {
        // Attachment start
        if (inAttachment && Object.keys(currentAttachment).length > 0) {
          currentArray.push(currentAttachment);
        }
        inAttachment = true;
        currentAttachment = {
          filename: line.replace('  - filename: "', "").replace(/"$/, ""),
        };
      } else if (inAttachment && line.startsWith("    ")) {
        // Attachment property
        const match = line.match(/^\s+(\w+):\s*(.*)$/);
        if (match) {
          let value: unknown = match[2].replace(/^"/, "").replace(/"$/, "");
          if (match[1] === "size") {
            value = parseInt(value as string, 10);
          }
          currentAttachment[match[1]] = value;
        }
      } else if (line.startsWith("  - ")) {
        // Array item (to, cc, bcc)
        const value = line.replace('  - "', "").replace(/"$/, "");
        currentArray.push(value);
      } else if (line.includes(":")) {
        // Save previous array if any
        if (inArray && currentKey) {
          if (inAttachment && Object.keys(currentAttachment).length > 0) {
            currentArray.push(currentAttachment);
            currentAttachment = {};
          }
          data[currentKey] = currentArray;
          currentArray = [];
          inArray = false;
          inAttachment = false;
        }

        const colonIdx = line.indexOf(":");
        const key = line.slice(0, colonIdx);
        const value = line.slice(colonIdx + 1).trim();

        if (value === "") {
          // Start of array
          currentKey = key;
          inArray = true;
        } else {
          // Simple value
          data[key] = value.replace(/^"/, "").replace(/"$/, "");
        }
      }
    }

    // Save last array
    if (inArray && currentKey) {
      if (inAttachment && Object.keys(currentAttachment).length > 0) {
        currentArray.push(currentAttachment);
      }
      data[currentKey] = currentArray;
    }

    // Construct ParsedEmail
    const email: ParsedEmail = {
      messageId: String(data.messageId || ""),
      from: String(data.from || ""),
      to: Array.isArray(data.to) ? (data.to as string[]) : [],
      subject: String(data.subject || ""),
      body,
      date: String(data.date || ""),
      attachments: [],
    };

    if (data.cc) {
      email.cc = Array.isArray(data.cc) ? (data.cc as string[]) : [];
    }

    if (data.bcc) {
      email.bcc = Array.isArray(data.bcc) ? (data.bcc as string[]) : [];
    }

    // Parse attachments
    if (Array.isArray(data.attachments)) {
      email.attachments = (data.attachments as Record<string, unknown>[]).map(
        (att) => ({
          filename: String(att.filename || ""),
          mimeType: String(att.mimeType || ""),
          size: Number(att.size || 0),
        })
      );
    }

    return email;
  } catch (err) {
    console.error(`[CC1] Failed to parse ${msgPath}:`, err);
    return null;
  }
}

// Export for direct testing
if (require.main === module) {
  // Test with sample email
  const testEmail: ParsedEmail = {
    messageId: "test-123",
    from: "sender@example.com",
    to: ["recipient@example.com"],
    cc: ["cc@example.com"],
    subject: "Test Email Subject",
    body: "This is the email body.\n\nWith multiple paragraphs.",
    date: new Date().toISOString(),
    attachments: [],
  };

  storeMessage(testEmail).then((result) => {
    console.log("Storage result:", JSON.stringify(result, null, 2));
  });
}
