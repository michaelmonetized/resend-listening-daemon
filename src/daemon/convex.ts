/**
 * Convex Backend Integration
 *
 * Stores email messages directly in local Convex backend
 * Uses HTTP API to call mutations directly (no SDK needed)
 */

interface EmailMessage {
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  bodyHtml?: string | null;
  date: string;
  messageId: string;
  attachments: any[];
}

// Convex local backend runs on port 3210
const CONVEX_BACKEND = "http://localhost:3210";

/**
 * Call Convex mutation via HTTP API
 * POST /api/query or /api/mutation
 */
async function callConvexMutation(
  functionPath: string,
  args: Record<string, any>
): Promise<any> {
  try {
    const response = await fetch(`${CONVEX_BACKEND}/api/mutation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: functionPath,
        args,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error(`[C3] Convex mutation error:`, err);
    throw err;
  }
}

/**
 * Store email in Convex
 */
export async function storeInConvex(email: EmailMessage): Promise<void> {
  try {
    const result = await callConvexMutation("messages:store", {
      from: email.from,
      to: email.to,
      cc: email.cc || [],
      bcc: email.bcc || [],
      subject: email.subject,
      body: email.body,
      bodyHtml: email.bodyHtml,
      date: email.date,
      messageId: email.messageId,
      attachments: email.attachments || [],
    });

    console.log(`[C3] ✓ Stored in Convex: ${email.messageId}`);
  } catch (err) {
    console.error(`[C3] Convex storage failed:`, err);
    // Non-fatal - local storage already works
  }
}
