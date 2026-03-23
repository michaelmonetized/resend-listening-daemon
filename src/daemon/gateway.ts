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

export async function deliverToGateway(email: ParsedEmail): Promise<void> {
  try {
    const subject = email.subject || "(no subject)";
    const from = email.from;
    const preview = email.body.slice(0, 100) || "(empty)";

    // Format message for Telegram
    const message = `📧 New Email\n\nFrom: ${from}\nSubject: ${subject}\n\nPreview: ${preview}`;

    // Send via openclaw message CLI (use full path)
    try {
      const cmd = `/Users/michael/.bun/bin/openclaw message send --channel telegram --target ${TELEGRAM_GROUP} --message ${JSON.stringify(message)}`;
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
