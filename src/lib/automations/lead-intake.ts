import { prisma } from "../prisma";
import { logActivity } from "../activity";
import { runLeadDay0Automation } from "./lead-automation";
import type { LeadIntakeInput } from "../validations";

/**
 * Handles a website form submission end to end (spec section 8, 10, 16):
 * find-or-create the Contact, create the Lead, associate the workspace,
 * run Day 0 automation, and create the initial EA follow-up task.
 */
export async function handleLeadIntake(input: LeadIntakeInput) {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: input.workspaceId } });

  // Reuse the existing contact record if this email already exists in the
  // workspace instead of duplicating the person's identity (spec section 7).
  let contact = await prisma.contact.findFirst({
    where: { workspaceId: workspace.id, email: input.email.toLowerCase() },
  });

  if (contact) {
    contact = await prisma.contact.update({
      where: { id: contact.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone || contact.phone,
        company: input.company || contact.company,
        jobTitle: input.jobTitle || contact.jobTitle,
      },
    });
  } else {
    contact = await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        company: input.company,
        jobTitle: input.jobTitle,
      },
    });
  }

  const lead = await prisma.lead.create({
    data: {
      workspaceId: workspace.id,
      contactId: contact.id,
      status: "New Lead",
      source: "Website Form",
      interestedIn: input.interestedIn,
      serviceOrProgram: input.serviceOrProgram,
      biggestChallenge: input.biggestChallenge,
      desiredResult: input.desiredResult,
      howHeard: input.howHeard,
      supportType: input.supportType,
      preferredProgramType: input.preferredProgramType,
      preferredStartDate: input.preferredStartDate,
      budgetRange: input.budgetRange,
      workedWithCoachBefore: input.workedWithCoachBefore ?? null,
      consultationRequested: input.consultationRequested ?? false,
    },
  });

  await logActivity({
    workspaceId: workspace.id,
    recordType: "lead",
    recordId: lead.id,
    eventType: "lead_submitted",
    summary: `${contact.firstName} ${contact.lastName} submitted the website form`,
  });

  await runLeadDay0Automation(lead.id);

  return lead;
}
