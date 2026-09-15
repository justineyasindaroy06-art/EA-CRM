import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { prisma } from "../prisma";
import { isTestMode, googleConfigured, gmailConfigured } from "./types";

/**
 * Server-side-only Google OAuth handling. Tokens live in the
 * IntegrationCredential table (never in the browser, never in a cookie).
 * There is exactly one application user in V1 (spec section 2), so a single
 * shared "google" credential row covers Calendar, Drive, and Gmail — all
 * requested under one consent screen.
 */

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/gmail.send",
];

export type ConnectionStatus = "mock" | "connected" | "disconnected" | "error";

/** Shared between the /authorize and /callback OAuth routes for CSRF protection. */
export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured. Set it in .env — see .env.example.`);
  }
  return value;
}

export function getOAuth2Client(): OAuth2Client {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = requireEnv("GOOGLE_REDIRECT_URI");
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/** Builds the Google consent-screen URL for the "Connect Google" button in Settings. */
export function getGoogleAuthUrl(state: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // ensures a refresh_token is returned even on re-auth
    scope: GOOGLE_SCOPES,
    state,
  });
}

/** Exchanges an OAuth callback `code` for tokens and persists them. */
export async function saveGoogleTokensFromCode(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("Google did not return an access token.");
  }

  // Google only returns a refresh_token on the FIRST consent unless the
  // user is forced through consent again — preserve the existing one if a
  // new request doesn't include it, so re-connecting doesn't silently lose
  // offline access.
  const existing = await prisma.integrationCredential.findUnique({ where: { provider: "google" } });

  await prisma.integrationCredential.upsert({
    where: { provider: "google" },
    create: {
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope ?? null,
      lastError: null,
      lastCheckedAt: new Date(),
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? null,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope ?? existing?.scope ?? null,
      lastError: null,
      lastCheckedAt: new Date(),
    },
  });
}

export async function disconnectGoogle() {
  await prisma.integrationCredential.deleteMany({ where: { provider: "google" } });
}

/**
 * Returns an OAuth2Client authenticated with a valid (refreshed if needed)
 * access token, or throws a clear, non-sensitive error if Google isn't
 * connected. Never call this in mock/test mode — callers must check
 * `isTestMode()` / `googleConfigured()` first.
 */
export async function getAuthorizedGoogleClient(): Promise<OAuth2Client> {
  const credential = await prisma.integrationCredential.findUnique({ where: { provider: "google" } });

  if (!credential) {
    throw new Error("Google is not connected. Go to Settings and click Connect Google.");
  }

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: credential.accessToken,
    refresh_token: credential.refreshToken ?? undefined,
    expiry_date: credential.expiryDate ? credential.expiryDate.getTime() : undefined,
  });

  const isExpired = credential.expiryDate ? credential.expiryDate.getTime() <= Date.now() : false;

  if (isExpired) {
    if (!credential.refreshToken) {
      const message = "Google access token expired and no refresh token is stored. Reconnect Google in Settings.";
      await prisma.integrationCredential.update({
        where: { provider: "google" },
        data: { lastError: message, lastCheckedAt: new Date() },
      });
      throw new Error(message);
    }

    try {
      const { credentials } = await client.refreshAccessToken();
      client.setCredentials(credentials);
      await prisma.integrationCredential.update({
        where: { provider: "google" },
        data: {
          accessToken: credentials.access_token ?? credential.accessToken,
          expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          lastError: null,
          lastCheckedAt: new Date(),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh Google access token.";
      await prisma.integrationCredential.update({
        where: { provider: "google" },
        data: { lastError: message, lastCheckedAt: new Date() },
      });
      throw new Error(`Google token refresh failed: ${message}`);
    }
  }

  return client;
}

/** Records a real-API-call failure against the stored credential (surfaced as "error" status in Settings). */
export async function recordGoogleApiError(message: string) {
  await prisma.integrationCredential
    .update({ where: { provider: "google" }, data: { lastError: message, lastCheckedAt: new Date() } })
    .catch(() => {
      // No credential row (shouldn't happen if we got far enough to call the
      // API) — nothing to record against.
    });
}

/** Clears a previously-recorded error after a real API call succeeds. */
export async function clearGoogleApiError() {
  await prisma.integrationCredential
    .update({ where: { provider: "google" }, data: { lastError: null, lastCheckedAt: new Date() } })
    .catch(() => {});
}

export interface IntegrationStatuses {
  calendar: ConnectionStatus;
  drive: ConnectionStatus;
  gmail: ConnectionStatus;
  lastError: string | null;
}

/**
 * The single source of truth for what Settings shows per integration
 * (spec production-readiness item 5): Mock while AUTOMATIONS_TEST_MODE is
 * on, Disconnected when credentials/OAuth aren't configured, Connected once
 * a token is stored, Error if the last real API call failed.
 */
export async function getIntegrationStatuses(): Promise<IntegrationStatuses> {
  if (isTestMode()) {
    return { calendar: "mock", drive: "mock", gmail: "mock", lastError: null };
  }

  if (!googleConfigured()) {
    return { calendar: "disconnected", drive: "disconnected", gmail: "disconnected", lastError: null };
  }

  const credential = await prisma.integrationCredential.findUnique({ where: { provider: "google" } });

  if (!credential) {
    return { calendar: "disconnected", drive: "disconnected", gmail: "disconnected", lastError: null };
  }

  const status: ConnectionStatus = credential.lastError ? "error" : "connected";
  const gmailStatus: ConnectionStatus = !gmailConfigured() ? "disconnected" : status;

  return { calendar: status, drive: status, gmail: gmailStatus, lastError: credential.lastError };
}
