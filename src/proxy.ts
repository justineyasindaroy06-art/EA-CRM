import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "ea_crm_session";
// /api/cron is intentionally public here — it has no session cookie to
// check (the caller is an external scheduler, not a browser) and instead
// protects itself with a CRON_SECRET bearer check inside the route handler.
// /api/health is public so Railway's deploy health check (no cookie either)
// can reach it; the route itself reveals nothing beyond ok/error.
const PUBLIC_PATHS = ["/login", "/api/lead-intake", "/api/cron", "/api/health"];

async function isAuthenticated(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const authed = await isAuthenticated(req);
  if (!authed) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
