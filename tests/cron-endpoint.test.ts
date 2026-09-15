import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/lead-followups/route";

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/cron/lead-followups", { headers });
}

describe("Cron endpoint auth (/api/cron/lead-followups)", () => {
  it("rejects a request with no Authorization header", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("rejects a request with the wrong secret", async () => {
    const res = await GET(makeRequest({ authorization: "Bearer wrong-secret" }));
    expect(res.status).toBe(401);
  });

  it("accepts a request with the correct secret and runs the scheduler", async () => {
    const res = await GET(makeRequest({ authorization: `Bearer ${process.env.CRON_SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.summary).toBeDefined();
  });

  it("fails closed (503) if CRON_SECRET is not configured at all", async () => {
    const original = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    try {
      const res = await GET(makeRequest({ authorization: "Bearer anything" }));
      expect(res.status).toBe(503);
    } finally {
      process.env.CRON_SECRET = original;
    }
  });

  it("never echoes the secret back in any response body", async () => {
    const res = await GET(makeRequest({ authorization: "Bearer wrong-secret" }));
    const text = await res.text();
    expect(text).not.toContain(process.env.CRON_SECRET);
  });
});
