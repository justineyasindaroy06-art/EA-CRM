import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/integrations/google/callback/route";
import { GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/integrations/google-oauth";

describe("Google OAuth callback — CSRF state check", () => {
  it("rejects a callback with no state cookie at all", async () => {
    const req = new NextRequest("http://localhost/api/integrations/google/callback?code=abc&state=xyz");
    const res = await GET(req);
    expect(res.status).toBe(307); // redirect
    expect(res.headers.get("location")).toContain("google_error=");
  });

  it("rejects a callback whose state param doesn't match the stored cookie", async () => {
    const req = new NextRequest("http://localhost/api/integrations/google/callback?code=abc&state=WRONG", {
      headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=RIGHT` },
    });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("google_error=");
  });

  it("surfaces Google's own error param (e.g. user declined consent) without attempting a token exchange", async () => {
    const req = new NextRequest("http://localhost/api/integrations/google/callback?error=access_denied");
    const res = await GET(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("google_error=");
    expect(decodeURIComponent(location)).toContain("access_denied");
  });

  it("rejects when code is missing even if state matches", async () => {
    const req = new NextRequest("http://localhost/api/integrations/google/callback?state=RIGHT", {
      headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=RIGHT` },
    });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("google_error=");
  });
});
