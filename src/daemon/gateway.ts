/**
 * C2: OpenClaw Gateway Delivery
 *
 * Sends email notifications to OpenClaw via openclaw message send CLI
 * Posts to Telegram group chat for quick notifications
 */

import { execSync } from "child_process";

// Email type from listen.ts
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
  attachments: any[];
}

// Telegram group for resendld notifications
const TELEGRAM_GROUP = "-1003740074376"; // HurleyUS group

// Resolve openclaw binary path (cross-platform)
function getOpenclawBinary(): string {
  try {
    // Try 'which openclaw' first (works on all platforms if in PATH)
    return execSync("which openclaw", { encoding: "utf-8" }).trim();
  } catch {
    // Fallback: try common bun install paths
    const home = process.env.HOME || process.env.USERPROFILE || "";
    const bunPaths = [
      `${home}/.bun/bin/openclaw`,
      `${home}/.local/bin/openclaw`,
      "/usr/local/bin/openclaw",
    ];
    for (const path of bunPaths) {
      try {
        execSync(`test -x ${path}`, { stdio: "pipe" });
        return path;
      } catch {
        // Continue to next path
      }
    }
    // Last resort: assume it's in PATH
    return "openclaw";
  }
}

export async function deliverToGateway(email: ParsedEmail): Promise<void> {
  try {
    const subject = email.subject || "(no subject)";
    const from = email.from;
    const preview = email.body.slice(0, 100) || "(empty)";

    // Format message for Telegram
    const message = `📧 New Email\n\nFrom: ${from}\nSubject: ${subject}\n\nPreview: ${preview}`;

    // Send via openclaw message CLI (resolved cross-platform)
    try {
      const openclawBin = getOpenclawBinary();
      const cmd = `${openclawBin} message send --channel telegram --target ${TELEGRAM_GROUP} --message ${JSON.stringify(message)}`;
      execSync(cmd, {
        stdio: "pipe",
        timeout: 10000,
        encoding: "utf-8",
      });
      console.log(`[C2] ✓ Delivered to Telegram`);
    } catch (telegramErr: any) {
      console.error(`[C2] Telegram failed:`, telegramErr.message);
    }

    // If this is a status/issue report, acknowledge receipt
    if (
      email.subject.toLowerCase().includes("issue") ||
      email.subject.toLowerCase().includes("bug") ||
      email.subject.toLowerCase().includes("status")
    ) {
      try {
        const ackMsg = `🔧 Issue acknowledged: "${email.subject}" (${email.messageId}). Rusty will investigate.`;
        execSync(
          `/Users/michael/.bun/bin/openclaw message send --channel telegram --target ${TELEGRAM_GROUP} --message ${JSON.stringify(ackMsg)}`,
          { stdio: "pipe", timeout: 5000 }
        );
      } catch (err) {
        // Non-fatal
      }
    }
  } catch (err: any) {
    console.error(`[C2] Error formatting message:`, err);
  }
}
