import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("Health check (/api/health)", () => {
  it("returns ok when the database is reachable", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });

  it("never reveals database details, credentials, or client data", async () => {
    const res = await GET();
    const text = await res.text();
    expect(text).not.toMatch(/DATABASE_URL|password|secret|@|postgres:\/\//i);
  });
});
