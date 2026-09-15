import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { handleLeadIntake } from "@/lib/automations/lead-intake";
import { createWorkspace } from "./fixtures";

describe("Lead intake", () => {
  it("website form creates a lead and contact", async () => {
    const workspace = await createWorkspace();

    const lead = await handleLeadIntake({
      workspaceId: workspace.id,
      firstName: "Jamie",
      lastName: "Rivera",
      email: "jamie.rivera@example.com",
    });

    expect(lead.status).toBe("New Lead");
    expect(lead.source).toBe("Website Form");

    const contact = await prisma.contact.findUnique({ where: { id: lead.contactId } });
    expect(contact?.email).toBe("jamie.rivera@example.com");
  });

  it("reuses the existing contact instead of duplicating it", async () => {
    const workspace = await createWorkspace();

    await handleLeadIntake({
      workspaceId: workspace.id,
      firstName: "Jamie",
      lastName: "Rivera",
      email: "jamie.rivera@example.com",
    });

    await handleLeadIntake({
      workspaceId: workspace.id,
      firstName: "Jamie",
      lastName: "Rivera-Updated",
      email: "jamie.rivera@example.com",
    });

    const contacts = await prisma.contact.findMany({ where: { workspaceId: workspace.id } });
    expect(contacts).toHaveLength(1);
    expect(contacts[0].lastName).toBe("Rivera-Updated");

    const leads = await prisma.lead.findMany({ where: { workspaceId: workspace.id } });
    expect(leads).toHaveLength(2);
  });

  it("allows lead status transitions", async () => {
    const workspace = await createWorkspace();
    const lead = await handleLeadIntake({
      workspaceId: workspace.id,
      firstName: "Jamie",
      lastName: "Rivera",
      email: "jamie.rivera@example.com",
    });

    const updated = await prisma.lead.update({ where: { id: lead.id }, data: { status: "Contacted" } });
    expect(updated.status).toBe("Contacted");

    const consultationBooked = await prisma.lead.update({ where: { id: lead.id }, data: { status: "Consultation Booked" } });
    expect(consultationBooked.status).toBe("Consultation Booked");
  });
});
