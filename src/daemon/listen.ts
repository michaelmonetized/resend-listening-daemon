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
      const output = execSync("resend emails receiving list --json", {
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
          const fullOutput = execSync(`resend emails receiving get ${email.id} --json`, {
            encoding: "utf-8",
          });
          const fullEmail = JSON.parse(fullOutput);

          const parsedEmail = {
            from: fullEmail.from || "unknown",
            to: Array.isArray(fullEmail.to) ? fullEmail.to : [fullEmail.to],
            cc: fullEmail.cc && Array.isArray(fullEmail.cc) ? fullEmail.cc : [],
            bcc: fullEmail.bcc && Array.isArray(fullEmail.bcc) ? fullEmail.bcc : [],
            subject: (fullEmail.subject || "no subject").toString(),
            body: (fullEmail.text || "").toString(),
            bodyHtml: fullEmail.html ? fullEmail.html.toString() : null,
            attachments: fullEmail.attachments || [],
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
        console.error(`[C1] Error polling:`, err.message);
      }
    }
  }, POLL_INTERVAL);
}

startListening().catch((err) => {
  console.error("[C1] Fatal:", err);
  process.exit(1);
});
