import { google } from "googleapis";
import { getAuthorizedGoogleClient, recordGoogleApiError, clearGoogleApiError } from "./google-oauth";

interface SendGmailParams {
  to: string;
  subject: string;
  body: string;
}

function encodeSubject(subject: string): string {
  // RFC 2047 encode so non-ASCII subjects (e.g. accented client names)
  // render correctly instead of being mangled.
  return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
}

function buildRawMessage(params: SendGmailParams, fromAddress: string): string {
  const lines = [
    `From: ${fromAddress}`,
    `To: ${params.to}`,
    `Subject: ${encodeSubject(params.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    params.body,
  ];
  const message = lines.join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Sends a real email via the Gmail API as the connected Google account.
 * Callers (src/lib/integrations/email.ts) are responsible for checking
 * test/mock mode first — this function always attempts a real send and
 * throws on failure so the caller never records a false "sent" status
 * (production-readiness item 4).
 */
export async function sendGmailMessage(params: SendGmailParams): Promise<{ messageId: string }> {
  const fromAddress = process.env.GMAIL_SENDER_ADDRESS;
  if (!fromAddress) {
    throw new Error("GMAIL_SENDER_ADDRESS is not configured.");
  }

  try {
    const auth = await getAuthorizedGoogleClient();
    const gmail = google.gmail({ version: "v1", auth });

    const raw = buildRawMessage(params, fromAddress);
    const response = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });

    await clearGoogleApiError();

    if (!response.data.id) {
      throw new Error("Gmail accepted the request but did not return a message ID.");
    }

    return { messageId: response.data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Gmail API error";
    await recordGoogleApiError(message);
    throw new Error(`Gmail send failed: ${message}`);
  }
}
