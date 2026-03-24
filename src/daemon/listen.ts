#!/usr/bin/env bun

/**
 * C1: Resend Listening Loop (Using resend-cli list)
 *
 * Polls resend emails receiving list --json every 5 seconds
 * Filters by recipient box
 * Tracks seen IDs to avoid re-processing
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { deliverToGateway } from "./gateway";
import { storeMessage } from "./storage";
import { storeInConvex } from "./convex";
import { parseInstructions, executeInstruction, formatResult } from "./executor";

// Configuration
const CONFIG_DIR = path.join(process.env.XDG_CONFIG_HOME || `${process.env.HOME}/.config`, "resendld");
const BOXES_FILE = path.join(CONFIG_DIR, "boxes.json");
const STATE_DIR = path.join(process.env.HOME, ".local/bin/resendld/state");
const SEEN_IDS_FILE = path.join(STATE_DIR, "seen-ids.json");
const POLL_INTERVAL = 5000; // 5 seconds

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

// Load API key from credentials file or environment
function getApiKey(): string {
  // Try environment first
  if (process.env.RESEND_API_KEY) {
    return process.env.RESEND_API_KEY;
  }

  // Try credentials file
  try {
    const credPath = path.join(process.env.HOME || "", ".config/resend/credentials.json");
    if (fs.existsSync(credPath)) {
      const creds = JSON.parse(fs.readFileSync(credPath, "utf-8"));
      // Handle both old format (teams.default.api_key) and new format
      if (creds.teams?.default?.api_key) {
        return creds.teams.default.api_key;
      }
    }
  } catch (err) {
    // Silently fail, will error at polling time
  }

  return "";
}

// Get resend binary path
function getResendPath(): string {
  const homeDir = process.env.HOME || "";
  const bunResendPath = path.join(homeDir, ".bun/bin/resend");
  
  try {
    if (fs.existsSync(bunResendPath)) {
      return bunResendPath;
    }
  } catch (err) {
    // Ignore
  }
  
  // Fall back to system resend
  return "resend";
}

async function startListening() {
  const boxes = loadBoxes();
  if (boxes.length === 0) {
    console.error(`[C1] No active boxes configured`);
    return;
  }

  // Validate API key early
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(`[C1] FATAL: RESEND_API_KEY not found in environment or ~/.config/resend/credentials.json`);
    return;
  }

  const resendPath = getResendPath();

  let seenIds = loadSeenIds();
  console.log(`[C1] Loaded ${seenIds.size} seen message IDs`);
  console.log(`[C1] Listening to: ${boxes.join(", ")}`);
  console.log(`[C1] Using resend: ${resendPath}`);

  // Poll every 5 seconds
  setInterval(async () => {
    try {
      console.log(`[C1] Polling... (timestamp: ${new Date().toISOString()})`);
      
      // Execute resend CLI with explicit API key in environment
      const env = {
        ...process.env,
        RESEND_API_KEY: apiKey,
      };

      const output = execSync(`${resendPath} emails receiving list --json`, {
        env,
        encoding: "utf-8",
      });
      const response = JSON.parse(output);
      const emails = response.data || [];

      for (const email of emails) {
        // Skip if already seen
        if (seenIds.has(email.id)) {
          continue;
        }

        // Filter by recipient box
        const recipients = Array.isArray(email.to) ? email.to : [email.to];
        const isRelevant = recipients.some((r: string) =>
          boxes.some((b) => r.toLowerCase() === b.toLowerCase())
        );

        if (!isRelevant) {
          continue;
        }

        seenIds.add(email.id);

        console.log(`[C1] New email: ${email.from} → ${recipients.join(", ")} - ${email.subject}`);

        try {
          // Use the email data we already have from the list endpoint
          const parsedEmail = {
            from: email.from || "unknown",
            to: Array.isArray(email.to) ? email.to : [email.to],
            cc: email.cc && Array.isArray(email.cc) ? email.cc : [],
            bcc: email.bcc && Array.isArray(email.bcc) ? email.bcc : [],
            subject: (email.subject || "no subject").toString(),
            body: (email.text || "").toString(),
            bodyHtml: email.html ? email.html.toString() : null,
            attachments: email.attachments || [],
            date: (email.created_at || new Date().toISOString()).toString(),
            messageId: email.id || "unknown",
          };

          // Store locally
          try {
            await storeMessage(parsedEmail);
          } catch (err) {
            console.error(`[CC1] Failed to store:`, err);
          }

          // Store in Convex
          try {
            await storeInConvex(parsedEmail);
          } catch (err) {
            // Convex errors are non-fatal
          }

          // Deliver email as a DIRECT AGENT TASK via /hooks/agent
          // This makes the agent treat it as a user prompt to execute, not a notification to relay
          try {
            const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789";
            const hooksToken = process.env.OPENCLAW_HOOKS_TOKEN || "";
            
            const prompt = `You received an email. Execute the instructions in it.\n\nFrom: ${parsedEmail.from}\nTo: ${parsedEmail.to.join(", ")}\nSubject: ${parsedEmail.subject}\nDate: ${parsedEmail.date}\n\n${parsedEmail.body}`;
            
            const hookPayload = {
              message: prompt,
              name: `Email from ${parsedEmail.from}`,
              wakeMode: "now",
              deliver: false,  // Don't auto-deliver to chat, let the agent decide
            };

            const response = await fetch(`${gatewayUrl}/hooks/agent`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${hooksToken}`,
              },
              body: JSON.stringify(hookPayload),
            });

            if (response.ok) {
              console.log(`[C4] ✓ Dispatched as agent task: ${parsedEmail.subject}`);
            } else {
              const errText = await response.text();
              console.error(`[C4] Hook failed (${response.status}): ${errText}`);
              
              // Fallback to cron systemEvent if hooks not enabled
              if (response.status === 404 || response.status === 401) {
                console.log(`[C4] Falling back to cron systemEvent...`);
                const FIRE_TIME = new Date(Date.now() + 10000).toISOString();
                const fallbackPrompt = `📧 ${parsedEmail.subject}\n\nFrom: ${parsedEmail.from}\n\n${parsedEmail.body}`;
                
                const child = require("child_process").spawn("openclaw", [
                  "cron", "add",
                  "--name", `email-${parsedEmail.messageId.slice(0, 8)}`,
                  "--at", FIRE_TIME,
                  "--system-event", fallbackPrompt,
                  "--session", "main",
                  "--delete-after-run"
                ], { stdio: "ignore" });
                child.unref();
                console.log(`[C4] ✓ Fallback queued to main session: ${parsedEmail.subject}`);
              }
            }
          } catch (err: any) {
            console.error(`[C4] Delivery error:`, err.message || err);
          }

          // Deliver to gateway
          try {
            await deliverToGateway(parsedEmail);
          } catch (err) {
            // Gateway errors are non-fatal
          }
        } catch (err) {
          console.error(`[C1] Error processing email ${email.id}:`, err);
        }
      }

      saveSeenIds(seenIds);
    } catch (err: any) {
      if (!err.message?.includes("ECONNREFUSED")) {
        console.error(`[C1] Error polling:`, err.message || String(err));
        if (err.stderr) console.error(`[C1] stderr:`, err.stderr.toString());
        if (err.stdout) console.error(`[C1] stdout:`, err.stdout.toString());
      }
    }
  }, POLL_INTERVAL);
}

startListening().catch((err) => {
  console.error("[C1] Fatal:", err);
  process.exit(1);
});

// Keep process alive forever
setInterval(() => {}, 1000);

// Catch any uncaught errors
process.on('uncaughtException', (err) => {
  console.error('[C1] UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[C1] UNHANDLED REJECTION:', reason);
});
