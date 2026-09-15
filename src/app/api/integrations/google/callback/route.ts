import { NextRequest, NextResponse } from "next/server";
import { saveGoogleTokensFromCode, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/integrations/google-oauth";

/**
 * Completes the Google OAuth flow. Also behind the session-cookie check in
 * src/proxy.ts — the browser that started at /authorize still carries the
 * CRM's own session cookie when Google redirects it back here (first-party,
 * same top-level navigation).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const expectedState = req.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  const settingsUrl = new URL("/settings", req.url);
  const response = (query: Record<string, string>) => {
    for (const [key, value] of Object.entries(query)) settingsUrl.searchParams.set(key, value);
    const res = NextResponse.redirect(settingsUrl);
    res.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return res;
  };

  if (errorParam) {
    return response({ google_error: `Google declined authorization: ${errorParam}` });
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return response({ google_error: "Google OAuth callback failed a security check (missing or mismatched state)." });
  }

  try {
    await saveGoogleTokensFromCode(code);
    return response({ google_connected: "1" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to complete Google OAuth.";
    return response({ google_error: message });
  }
}
