export type IntegrationStatus = "connected" | "disconnected" | "awaiting_authorization" | "failed";

export function isTestMode(): boolean {
  // Defaults to test mode unless explicitly disabled — never send/create real
  // external side effects unless the EA has both configured credentials AND
  // turned test mode off (spec section 31, 46).
  return process.env.AUTOMATIONS_TEST_MODE !== "false";
}

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function gmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_SENDER_ADDRESS) && googleConfigured();
}

export function googleCalendarStatus(): IntegrationStatus {
  return googleConfigured() ? "connected" : "disconnected";
}

export function googleDriveStatus(): IntegrationStatus {
  return googleConfigured() ? "connected" : "disconnected";
}

export function gmailStatus(): IntegrationStatus {
  return gmailConfigured() ? "connected" : "disconnected";
}
