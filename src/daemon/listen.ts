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

async function startListening() {
  const boxes = loadBoxes();
  if (boxes.length === 0) {
    console.error(`[C1] No active boxes configured`);
    return;
  }

  let seenIds = loadSeenIds();
  console.log(`[C1] Loaded ${seenIds.size} seen message IDs`);
  console.log(`[C1] Listening to: ${boxes.join(", ")}`);

  // Poll every 5 seconds
  setInterval(async () => {
    try {
      console.log(`[C1] Polling... (timestamp: ${new Date().toISOString()})`);
      // Use resend CLI directly — ensure PATH is set in shell
      // bun exec inherits PATH, so if ~/.zshrc has PATH export, this works
      const output = execSync(`resend emails receiving list --json`, {
        env: {
          ...process.env,
          // Add bun bin to PATH for systems that don't have ~/.zshrc sourced
          PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`,
        },
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
            date: (fullEmail.created_at || new Date().toISOString()).toString(),
            messageId: fullEmail.id || "unknown",
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

          // Deliver full email content + subject to main session as direct instructions
          // Fire in background (non-blocking) so daemon keeps polling
          try {
            const CURRENT_EPOCH = Math.floor(Date.now() / 1000);
            const FIRE_EPOCH = CURRENT_EPOCH + 10;
            const FIRE_TIME = new Date(FIRE_EPOCH * 1000).toISOString();
            
            const prompt = `📧 ${parsedEmail.subject}\n\nFrom: ${parsedEmail.from}\n\n${parsedEmail.body}`;
            
            // Fire cron add in background (don't wait for it)
            const child = require("child_process").spawn("openclaw", [
              "cron", "add",
              "--name", `email-${parsedEmail.messageId.slice(0, 8)}`,
              "--at", FIRE_TIME,
              "--system-event", prompt,
              "--session", "main",
              "--delete-after-run"
            ], { stdio: "ignore" });
            
            child.unref(); // Let it run independently
            console.log(`[C4] ✓ Queued to main session: ${parsedEmail.subject}`);

            // Also report to Telegram (non-blocking)
            const telegramChild = require("child_process").spawn("openclaw", [
              "message", "send",
              "--channel", "telegram",
              "--target", "-1003740074376",
              "--message", `📧 ${parsedEmail.subject}\n\nFrom: ${parsedEmail.from}`
            ], { stdio: "ignore" });
            
            telegramChild.unref();
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
