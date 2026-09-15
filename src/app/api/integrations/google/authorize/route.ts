import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getGoogleAuthUrl, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/integrations/google-oauth";

/**
 * Starts the Google OAuth flow. Reached only by the logged-in EA (this
 * route sits behind the normal session-cookie check in src/proxy.ts — it is
 * NOT in the public-paths list). Generates a random `state` value and
 * stores it in a short-lived httpOnly cookie so the callback can verify the
 * redirect actually came from a flow we started (CSRF protection).
 */
export async function GET(req: NextRequest) {
  try {
    const state = randomBytes(16).toString("hex");
    const authUrl = getGoogleAuthUrl(state);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600, // 10 minutes is plenty for a consent-screen round trip
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google OAuth is not configured.";
    const url = new URL("/settings", req.url);
    url.searchParams.set("google_error", message);
    return NextResponse.redirect(url);
  }
}
