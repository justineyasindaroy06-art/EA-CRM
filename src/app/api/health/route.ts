import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Lightweight health check for Railway's deploy health check (Railway item
 * 11). Confirms the app process is up and the database is reachable —
 * nothing else. Never returns credentials, secrets, row counts, or any
 * client data; a failure is reported as a bare status, not the underlying
 * error message (which could otherwise leak a connection string).
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
