import * as https from "https";
import * as http from "http";
import * as url from "url";

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

// Exponential backoff retry config
const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000;

// Get gateway URL from environment or config
function getGatewayUrl(): string {
  return process.env.OPENCLAW_GATEWAY_URL || "http://localhost:8000";
}

// Format email as OpenClaw message event
function formatMessageEvent(email: ParsedEmail): Record<string, any> {
  // Create preview of body (first 200 chars)
  const bodyPreview = email.body.length > 200 ? email.body.slice(0, 200) + "..." : email.body;

  return {
    type: "email.received",
    source: "resendld",
    payload: {
      messageId: email.messageId,
      from: email.from,
      to: email.to,
      cc: email.cc || [],
      bcc: email.bcc || [],
      subject: email.subject,
      bodyPreview,
      body: email.body,
      bodyHtml: email.bodyHtml,
      date: email.date,
      attachmentCount: email.attachments.length,
      attachments: email.attachments.map((a) => ({
        filename: a.filename,
        mimeType: a.mimeType || "application/octet-stream",
        size: a.size || 0,
      })),
    },
    timestamp: new Date().toISOString(),
  };
}

// POST to gateway with retry logic
async function postToGateway(
  gatewayUrl: string,
  payload: Record<string, any>,
  retryCount = 0
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new url.URL(gatewayUrl);
      const isHttps = parsedUrl.protocol === "https:";
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname || "/",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "resendld/1.0",
          "X-Source": "resendld",
        },
      };

      const req = httpModule.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[C2] Gateway delivery successful (${res.statusCode})`);
            resolve();
          } else {
            const error = new Error(`Gateway returned ${res.statusCode}: ${data}`);
            if (retryCount < MAX_RETRIES) {
              const delay = INITIAL_DELAY_MS * Math.pow(2, retryCount);
              console.warn(
                `[C2] Delivery failed with ${res.statusCode}. Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
              );
              setTimeout(() => {
                postToGateway(gatewayUrl, payload, retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              }, delay);
            } else {
              reject(error);
            }
          }
        });
      });

      req.on("error", (err) => {
        if (retryCount < MAX_RETRIES) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, retryCount);
          console.warn(
            `[C2] Gateway error: ${err.message}. Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
          );
          setTimeout(() => {
            postToGateway(gatewayUrl, payload, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, delay);
        } else {
          reject(err);
        }
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error("Gateway request timeout"));
      });

      const jsonPayload = JSON.stringify(payload);
      req.write(jsonPayload);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Main delivery function
export async function deliverToGateway(email: ParsedEmail): Promise<void> {
  try {
    const gatewayUrl = getGatewayUrl();
    const messageEvent = formatMessageEvent(email);

    console.log(`[C2] Delivering to gateway: ${gatewayUrl}`);
    console.log(`[C2] Message: ${email.messageId} from ${email.from}`);

    await postToGateway(gatewayUrl, messageEvent);

    console.log(`[C2] Successfully delivered: ${email.messageId}`);
  } catch (err) {
    console.error(`[C2] Failed to deliver after ${MAX_RETRIES} retries:`, err);
    // Log failure but don't crash (message is still stored locally)
  }
}
