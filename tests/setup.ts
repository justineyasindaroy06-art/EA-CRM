import path from "path";
import { beforeEach } from "vitest";

process.env.DATABASE_URL = `file:${path.resolve(__dirname, "test.db")}`;
process.env.AUTOMATIONS_TEST_MODE = "true";
process.env.BOOKING_LINK_URL = "https://example.com/book";
process.env.CRON_SECRET = "test-cron-secret";
// Left unset by default so googleConfigured()/gmailConfigured() are false in
// most tests; individual tests set/restore these when testing the
// configured-but-mocked and OAuth-URL-generation paths.
delete process.env.GOOGLE_CLIENT_ID;
delete process.env.GOOGLE_CLIENT_SECRET;
delete process.env.GMAIL_SENDER_ADDRESS;

import { prisma } from "@/lib/prisma";

async function resetDb() {
  await prisma.integrationCredential.deleteMany();
  await prisma.automationRun.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.clientPackage.deleteMany();
  await prisma.package.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.fileAsset.deleteMany();
  await prisma.task.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.contentItem.deleteMany();
  await prisma.client.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.setting.deleteMany();
}

beforeEach(async () => {
  await resetDb();
  await prisma.emailTemplate.createMany({
    data: [
      { key: "lead_welcome", name: "Welcome", subject: "Hi {{first_name}}", body: "Booking: {{booking_link}}" },
      { key: "lead_followup", name: "Follow-up", subject: "Following up", body: "Still there?" },
      { key: "lead_final_followup", name: "Final", subject: "Last note", body: "Bye for now" },
    ],
  });
});
