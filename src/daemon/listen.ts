import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { deliverToGateway } from "./gateway";
import { storeMessage } from "./storage";

// Types
interface Box {
  email: string;
  isActive: boolean;
  lastSync: string | null;
}

interface BoxConfig {
  boxes: Box[];
}

interface EmailAttachment {
  filename: string;
  data: string; // base64
  mimeType?: string;
}

interface ParsedEmail {
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

// Load boxes configuration
function loadBoxes(): Box[] {
  const configDir = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME!, ".config");
  const boxesPath = path.join(configDir, "resendld", "boxes.json");

  if (!fs.existsSync(boxesPath)) {
    console.error(`[C1] Config not found: ${boxesPath}`);
    return [];
  }

  try {
    const config: BoxConfig = JSON.parse(fs.readFileSync(boxesPath, "utf-8"));
    const active = config.boxes.filter((b) => b.isActive);
    console.log(`[C1] Loaded ${active.length} active boxes`);
    return active;
  } catch (err) {
    console.error(`[C1] Failed to parse boxes.json:`, err);
    return [];
  }
}

// Parse email stream from resend CLI output
function parseEmailStream(output: string): ParsedEmail | null {
  try {
    // The resend CLI outputs structured JSON for each received email
    // Format: { "from": "...", "to": [...], "subject": "...", "body": "...", "attachments": [...] }
    const lines = output.split("\n").filter((line) => line.trim());

    // Try to find JSON object in output
    for (const line of lines) {
      try {
        const json = JSON.parse(line);

        if (json.from && json.to && json.subject) {
          // Generate messageId if not present
          const messageId = json.messageId || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

          return {
            messageId,
            from: json.from,
            to: Array.isArray(json.to) ? json.to : [json.to],
            cc: json.cc ? (Array.isArray(json.cc) ? json.cc : [json.cc]) : undefined,
            bcc: json.bcc ? (Array.isArray(json.bcc) ? json.bcc : [json.bcc]) : undefined,
            subject: json.subject || "(no subject)",
            body: json.body || "",
            bodyHtml: json.bodyHtml,
            date: json.date || new Date().toISOString(),
            attachments: json.attachments || [],
          };
        }
      } catch {
        // Not JSON, continue
      }
    }

    // Fallback: parse raw email format (basic SMTP)
    return parseRawEmail(output);
  } catch (err) {
    console.error("[C1] Failed to parse email stream:", err);
    return null;
  }
}

// Basic raw email parser (SMTP-like format)
function parseRawEmail(raw: string): ParsedEmail | null {
  const lines = raw.split("\n");
  const headers: Record<string, string> = {};
  let body = "";
  let inBody = false;

  for (const line of lines) {
    if (!inBody) {
      if (line.trim() === "") {
        inBody = true;
      } else {
        const [key, ...valueParts] = line.split(":");
        if (key && valueParts.length) {
          headers[key.toLowerCase().trim()] = valueParts.join(":").trim();
        }
      }
    } else {
      body += line + "\n";
    }
  }

  // Extract fields
  const from = headers.from || "unknown@example.com";
  const to = (headers.to || "").split(",").map((e) => e.trim());
  const cc = headers.cc ? headers.cc.split(",").map((e) => e.trim()) : undefined;
  const subject = headers.subject || "(no subject)";
  const date = headers.date || new Date().toISOString();

  if (!from || to.length === 0) {
    return null;
  }

  return {
    messageId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    from,
    to,
    cc,
    subject,
    body: body.trim(),
    date,
    attachments: [],
  };
}

// Main listening loop
async function listenToBox(box: Box): Promise<void> {
  console.log(`[C1] Starting listener for ${box.email}`);

  // Spawn resend CLI listening process
  const listener = spawn("resend", ["emails", "receiving", "listen", "--to", box.email], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  let buffer = "";

  listener.stdout!.on("data", async (chunk: Buffer) => {
    buffer += chunk.toString();

    // Try to parse complete emails from buffer
    const lines = buffer.split("\n");

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        const email = parseEmailStream(line);

        if (email) {
          console.log(`[C1] Received email: ${email.subject} from ${email.from}`);

          try {
            // Store locally (CC1)
            await storeMessage(email);

            // Deliver to gateway
            await deliverToGateway(email);

            console.log(`[C1] Successfully processed: ${email.messageId}`);
          } catch (err) {
            console.error(`[C1] Failed to process email ${email.messageId}:`, err);
          }
        }
      }
    }

    // Keep incomplete line in buffer
    buffer = lines[lines.length - 1];
  });

  listener.stderr!.on("data", (chunk: Buffer) => {
    console.error(`[C1] Listener error for ${box.email}:`, chunk.toString());
  });

  listener.on("exit", (code) => {
    if (code !== 0) {
      console.warn(`[C1] Listener exited with code ${code} for ${box.email}. Restarting in 10s...`);
      setTimeout(() => listenToBox(box), 10000);
    }
  });

  listener.on("error", (err) => {
    console.error(`[C1] Failed to spawn listener for ${box.email}:`, err);
    setTimeout(() => listenToBox(box), 10000);
  });
}

// Main entry point
async function main() {
  console.log("[C1] Resendld listening daemon started");

  const boxes = loadBoxes();

  if (boxes.length === 0) {
    console.error("[C1] No active boxes configured. Exiting.");
    process.exit(1);
  }

  // Start listener for each box
  const listeners = boxes.map((box) => listenToBox(box));

  // Keep process alive
  await Promise.all(listeners);
}

main().catch((err) => {
  console.error("[C1] Fatal error:", err);
  process.exit(1);
});
