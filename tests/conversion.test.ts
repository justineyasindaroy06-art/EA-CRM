import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { convertLeadToClient, getConversionReadiness } from "@/lib/automations/conversion";
import { createWorkspace, createLeadWithContact } from "./fixtures";

describe("Lead to Client conversion", () => {
  it("requires EA confirmation before converting", async () => {
    const workspace = await createWorkspace();
    const { lead } = await createLeadWithContact(workspace.id);

    await expect(convertLeadToClient(lead.id)).rejects.toThrow(/EA confirmation/);
  });

  it("readiness checklist reflects consultation/agreement/payment/EA confirmation independently", () => {
    const readiness = getConversionReadiness({
      consultationStatus: "Completed",
      agreementStatus: "Signed",
      paymentStatus: "Paid",
      eaConfirmedConversion: false,
    });

    expect(readiness.consultationCompleted).toBe(true);
    expect(readiness.agreementSigned).toBe(true);
    expect(readiness.paymentReceived).toBe(true);
    // Even with every signal green, conversion is not ready without EA confirmation.
    expect(readiness.readyToConvert).toBe(false);
  });

  it("converts a lead to a client, preserving contact identity and lead history, and creates onboarding tasks", async () => {
    const workspace = await createWorkspace();
    const { lead, contact } = await createLeadWithContact(workspace.id);
    await prisma.lead.update({ where: { id: lead.id }, data: { eaConfirmedConversion: true } });

    const client = await convertLeadToClient(lead.id);

    expect(client.contactId).toBe(contact.id); // contact reused, not duplicated
    expect(client.workspaceId).toBe(workspace.id);

    const updatedLead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updatedLead.convertedToClientId).toBe(client.id); // lead history preserved, not deleted

    const onboardingTasks = await prisma.task.findMany({ where: { relatedClientId: client.id } });
    expect(onboardingTasks.length).toBeGreaterThanOrEqual(5);
  });

  it("converting twice does not create a second client", async () => {
    const workspace = await createWorkspace();
    const { lead } = await createLeadWithContact(workspace.id);
    await prisma.lead.update({ where: { id: lead.id }, data: { eaConfirmedConversion: true } });

    const first = await convertLeadToClient(lead.id);
    const second = await convertLeadToClient(lead.id);

    expect(second.id).toBe(first.id);
    const clients = await prisma.client.findMany({ where: { workspaceId: workspace.id } });
    expect(clients).toHaveLength(1);
  });
});
