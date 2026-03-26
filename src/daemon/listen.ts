#!/usr/bin/env bun

/**
 * C1: Resend Listening Loop (Pure fetch — zero CLI dependencies)
 *
 * Polls Resend API directly every 5 seconds via fetch()
 * Fetches full email body per message
 * Dispatches to OpenClaw /hooks/agent as direct tasks
 * Falls back to cron systemEvent if hooks unavailable
 */

import * as fs from "fs";
import * as path from "path";
import { storeMessage } from "./storage";
import { storeInConvex } from "./convex";

// Configuration
const CONFIG_DIR = path.join(process.env.XDG_CONFIG_HOME || `${process.env.HOME}/.config`, "resendld");
const BOXES_FILE = path.join(CONFIG_DIR, "boxes.json");
const STATE_DIR = path.join(process.env.HOME || "", ".local/bin/resendld/state");
const SEEN_IDS_FILE = path.join(STATE_DIR, "seen-ids.json");
const POLL_INTERVAL = 5000; // 5 seconds
const RESEND_API = "https://api.resend.com";

// Ensure state directory
if (!fs.existsSync(STATE_DIR)) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

// Load/save seen IDs
function loadSeenIds(): Set<string> {
  try {
    if (fs.existsSync(SEEN_IDS_FILE)) {
      return new Set(JSON.parse(fs.readFileSync(SEEN_IDS_FILE, "utf-8")));
    }
  } catch (err) {}
  return new Set();
}

function saveSeenIds(ids: Set<string>) {
  try {
    fs.writeFileSync(SEEN_IDS_FILE, JSON.stringify(Array.from(ids)), "utf-8");
  } catch (err) {}
}

// Load boxes
function loadBoxes(): string[] {
  try {
    const config = JSON.parse(fs.readFileSync(BOXES_FILE, "utf-8"));
    return config.boxes
      .filter((b: { isActive: boolean }) => b.isActive)
      .map((b: { email: string }) => b.email);
  } catch (err) {
    console.error(`[C1] Error loading boxes:`, err);
    return [];
  }
}

// Load API key from environment or credentials file
function getApiKey(): string {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;

  try {
    const credPath = path.join(process.env.HOME || "", ".config/resend/credentials.json");
    if (fs.existsSync(credPath)) {
      const creds = JSON.parse(fs.readFileSync(credPath, "utf-8"));
      if (creds.teams?.default?.api_key) return creds.teams.default.api_key;
    }
  } catch (err) {}

  return "";
}

// List received emails via Resend API
async function listEmails(apiKey: string): Promise<any[]> {
  const res = await fetch(`${RESEND_API}/emails/receiving`, {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Resend API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data as any).data || [];
}

// Fetch full email content (body, html, headers)
async function fetchEmail(apiKey: string, emailId: string): Promise<any> {
  const res = await fetch(`${RESEND_API}/emails/receiving/${emailId}`, {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Resend API ${res.status}: ${await res.text()}`);
  return res.json();
}

// Dispatch email as agent task via /hooks/agent
async function dispatchToAgent(parsedEmail: any): Promise<boolean> {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || "https://localhost:18789";
  const hooksToken = process.env.OPENCLAW_HOOKS_TOKEN || "";

  const prompt = [
    `You received an email. Execute the instructions in it.`,
    ``,
    `From: ${parsedEmail.from}`,
    `To: ${parsedEmail.to.join(", ")}`,
    `Subject: ${parsedEmail.subject}`,
    `Date: ${parsedEmail.date}`,
    ``,
    parsedEmail.body,
  ].join("\n");

  const hookPayload = {
    message: prompt,
    name: `Email from ${parsedEmail.from}`,
    wakeMode: "now",
    deliver: false,
  };

  try {
    // @ts-ignore - bun supports tls options in fetch
    const res = await fetch(`${gatewayUrl}/hooks/agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${hooksToken}`,
      },
      body: JSON.stringify(hookPayload),
      tls: { rejectUnauthorized: false },
    });

    if (res.ok) {
      console.log(`[C4] ✓ Dispatched as agent task: ${parsedEmail.subject}`);
      return true;
    }

    const errText = await res.text();
    console.error(`[C4] Hook failed (${res.status}): ${errText}`);

    // Fallback to cron systemEvent if hooks not available
    if (res.status === 404 || res.status === 401) {
      return await fallbackToCron(parsedEmail);
    }
  } catch (err: any) {
    console.error(`[C4] Delivery error:`, err.message || err);
  }

  return false;
}

// Fallback: fire cron systemEvent via openclaw CLI
async function fallbackToCron(parsedEmail: any): Promise<boolean> {
  try {
    console.log(`[C4] Falling back to cron systemEvent...`);
    const FIRE_TIME = new Date(Date.now() + 10000).toISOString();
    const prompt = `📧 ${parsedEmail.subject}\n\nFrom: ${parsedEmail.from}\n\n${parsedEmail.body}`;

    const child = Bun.spawn(["openclaw", "cron", "add",
      "--name", `email-${parsedEmail.messageId.slice(0, 8)}`,
      "--at", FIRE_TIME,
      "--system-event", prompt,
      "--session", "main",
      "--delete-after-run"
    ], { stdio: ["ignore", "ignore", "ignore"] });

    child.unref();
    console.log(`[C4] ✓ Fallback queued: ${parsedEmail.subject}`);
    return true;
  } catch (err: any) {
    console.error(`[C4] Fallback failed:`, err.message || err);
    return false;
  }
}

async function startListening() {
  const boxes = loadBoxes();
  if (boxes.length === 0) {
    console.error(`[C1] No active boxes configured`);
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(`[C1] FATAL: RESEND_API_KEY not found`);
    return;
  }

  let seenIds = loadSeenIds();
  console.log(`[C1] Loaded ${seenIds.size} seen message IDs`);
  console.log(`[C1] Listening to: ${boxes.join(", ")}`);
  console.log(`[C1] Mode: Pure fetch (zero CLI dependencies)`);

  // Poll loop
  setInterval(async () => {
    try {
      console.log(`[C1] Polling... (timestamp: ${new Date().toISOString()})`);

      const emails = await listEmails(apiKey);

      for (const email of emails) {
        if (seenIds.has(email.id)) continue;

        // Filter by recipient box
        const recipients = Array.isArray(email.to) ? email.to : [email.to];
        const isRelevant = recipients.some((r: string) =>
          boxes.some((b) => r.toLowerCase() === b.toLowerCase())
        );
        if (!isRelevant) continue;

        seenIds.add(email.id);
        console.log(`[C1] New email: ${email.from} → ${recipients.join(", ")} - ${email.subject}`);

        try {
          // Fetch full email content (list endpoint has no body)
          const fullEmail = await fetchEmail(apiKey, email.id);
          console.log(`[C1] Body: ${(fullEmail.text || "").length} chars`);

          // Helper: Strip HTML tags
          const stripHtml = (html: string) => {
            if (!html) return "";
            return html
              .replace(/<br\s*\/?>/gi, "\n")
              .replace(/<\/p>/gi, "\n\n")
              .replace(/<[^>]+>/g, "")
              .replace(/&nbsp;/g, " ")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/\n\s*\n/g, "\n\n");
          };

          // Fallback: use HTML if text is empty
          const emailBody = fullEmail.text || stripHtml(fullEmail.html || "") || "(empty body)";

          const parsedEmail = {
            from: fullEmail.from || "unknown",
            to: Array.isArray(fullEmail.to) ? fullEmail.to : [fullEmail.to],
            cc: fullEmail.cc || [],
            bcc: fullEmail.bcc || [],
            subject: (fullEmail.subject || "no subject").toString(),
            body: emailBody.toString(),
            bodyHtml: fullEmail.html || null,
            attachments: fullEmail.attachments || [],
            date: (fullEmail.created_at || new Date().toISOString()).toString(),
            messageId: fullEmail.id || "unknown",
          };

          // Store locally (non-blocking)
          storeMessage(parsedEmail).catch((err) => console.error(`[CC1] Store failed:`, err));

          // Store in Convex (non-blocking)
          storeInConvex(parsedEmail).catch(() => {});

          // Dispatch as agent task
          await dispatchToAgent(parsedEmail);

        } catch (err) {
          console.error(`[C1] Error processing email ${email.id}:`, err);
        }
      }

      saveSeenIds(seenIds);
    } catch (err: any) {
      if (!err.message?.includes("ECONNREFUSED")) {
        console.error(`[C1] Poll error:`, err.message || String(err));
      }
    }
  }, POLL_INTERVAL);
}

startListening().catch((err) => {
  console.error("[C1] Fatal:", err);
  process.exit(1);
});

// Keep alive
setInterval(() => {}, 60000);

process.on('uncaughtException', (err) => console.error('[C1] UNCAUGHT:', err));
process.on('unhandledRejection', (reason) => console.error('[C1] UNHANDLED:', reason));
