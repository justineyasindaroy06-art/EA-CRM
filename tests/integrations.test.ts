import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent } from "@/lib/integrations/google-calendar";
import { createClientDriveStructure, DEFAULT_DRIVE_FOLDERS } from "@/lib/integrations/google-drive";
import { sendAutomationEmail } from "@/lib/integrations/email";
import { googleConfigured, gmailConfigured, isTestMode } from "@/lib/integrations/types";
import { getGoogleAuthUrl, getIntegrationStatuses } from "@/lib/integrations/google-oauth";
import { createWorkspace } from "./fixtures";

const ENV_KEYS = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI", "GMAIL_SENDER_ADDRESS", "AUTOMATIONS_TEST_MODE"] as const;

function snapshotEnv() {
  return Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
}

function restoreEnv(snapshot: Record<string, string | undefined>) {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
}

describe("Google Calendar integration — mock mode", () => {
  it("returns a clearly-fake mocked event when in test mode", async () => {
    const event = await createCalendarEvent({ title: "Test", startAt: new Date(), endAt: new Date() });
    expect(event.mocked).toBe(true);
    expect(event.externalCalendarEventId).toMatch(/^mock_event_/);
    expect(event.googleMeetUrl).toContain("meet.google.com/mock-");
  });

  it("never calls a real Google API when credentials are configured but test mode is on", async () => {
    const snapshot = snapshotEnv();
    try {
      process.env.GOOGLE_CLIENT_ID = "fake-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "fake-secret";
      process.env.AUTOMATIONS_TEST_MODE = "true"; // test mode wins even with "credentials" present
      const event = await createCalendarEvent({ title: "Test", startAt: new Date(), endAt: new Date() });
      expect(event.mocked).toBe(true);
    } finally {
      restoreEnv(snapshot);
    }
  });
});

describe("Google Drive integration — mock mode", () => {
  it("returns a clearly-fake mocked folder link and the standard folder list", async () => {
    const result = await createClientDriveStructure("Test Client");
    expect(result.mocked).toBe(true);
    expect(result.rootUrl).toContain("drive.google.com/drive/folders/mock-");
    expect(result.folders).toEqual(DEFAULT_DRIVE_FOLDERS);
    expect(result.folders).toHaveLength(6);
  });
});

describe("Gmail / email integration — mock and misconfigured modes", () => {
  it("mock mode: records a success AutomationRun without ever hitting a real API", async () => {
    const workspace = await createWorkspace();
    const result = await sendAutomationEmail({ workspaceId: workspace.id, templateKey: "lead_welcome", to: "a@example.com" });

    expect(result.sent).toBe(true);
    expect(result.mocked).toBe(true);

    const runs = await prisma.automationRun.findMany({ where: { workspaceId: workspace.id, automationName: "email:lead_welcome" } });
    expect(runs).toHaveLength(1);
    expect(runs[0].testMode).toBe(true);
    expect(runs[0].status).toBe("success");
  });

  it("missing template: records an error run and does not claim success", async () => {
    const workspace = await createWorkspace();
    const result = await sendAutomationEmail({ workspaceId: workspace.id, templateKey: "does_not_exist", to: "a@example.com" });

    expect(result.sent).toBe(false);
    const runs = await prisma.automationRun.findMany({ where: { workspaceId: workspace.id, automationName: "email:does_not_exist" } });
    expect(runs[0].status).toBe("error");
  });

  it("disabled template: skips sending and records a skipped run", async () => {
    const workspace = await createWorkspace();
    const template = await prisma.emailTemplate.findUniqueOrThrow({ where: { key: "lead_followup" } });
    await prisma.emailTemplate.update({ where: { id: template.id }, data: { enabled: false } });

    const result = await sendAutomationEmail({ workspaceId: workspace.id, templateKey: "lead_followup", to: "a@example.com" });

    expect(result.sent).toBe(false);
    const runs = await prisma.automationRun.findMany({ where: { workspaceId: workspace.id, automationName: "email:lead_followup" } });
    expect(runs[0].status).toBe("skipped");
  });
});

describe("Integration configuration helpers", () => {
  afterEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GMAIL_SENDER_ADDRESS;
  });

  it("googleConfigured() is false without both client id and secret", () => {
    expect(googleConfigured()).toBe(false);
    process.env.GOOGLE_CLIENT_ID = "id-only";
    expect(googleConfigured()).toBe(false);
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    expect(googleConfigured()).toBe(true);
  });

  it("gmailConfigured() additionally requires GMAIL_SENDER_ADDRESS", () => {
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    expect(gmailConfigured()).toBe(false);
    process.env.GMAIL_SENDER_ADDRESS = "ea@example.com";
    expect(gmailConfigured()).toBe(true);
  });

  it("isTestMode() defaults to true unless explicitly set to \"false\"", () => {
    expect(isTestMode()).toBe(true);
  });

  it("getGoogleAuthUrl() builds a real Google consent URL containing the client id, when configured", () => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/integrations/google/callback";

    const url = getGoogleAuthUrl("test-state-value");
    expect(url).toContain("accounts.google.com");
    expect(url).toContain("client_id=test-client-id");
    expect(url).toContain("state=test-state-value");
    expect(url).toContain("access_type=offline");
  });

  it("getGoogleAuthUrl() throws a clear error when Google isn't configured", () => {
    expect(() => getGoogleAuthUrl("x")).toThrow(/GOOGLE_CLIENT_ID/);
  });

  it("getIntegrationStatuses() reports 'mock' for all three integrations while test mode is on", async () => {
    const statuses = await getIntegrationStatuses();
    expect(statuses).toEqual({ calendar: "mock", drive: "mock", gmail: "mock", lastError: null });
  });

  it("getIntegrationStatuses() reports 'disconnected' when test mode is off and Google isn't configured", async () => {
    process.env.AUTOMATIONS_TEST_MODE = "false";
    try {
      const statuses = await getIntegrationStatuses();
      expect(statuses.calendar).toBe("disconnected");
      expect(statuses.drive).toBe("disconnected");
      expect(statuses.gmail).toBe("disconnected");
    } finally {
      process.env.AUTOMATIONS_TEST_MODE = "true";
    }
  });
});
