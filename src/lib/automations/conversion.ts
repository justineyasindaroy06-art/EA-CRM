import { prisma } from "../prisma";
import { logActivity } from "../activity";
import { createClientDriveStructure } from "../integrations/google-drive";

export interface ConversionReadiness {
  consultationCompleted: boolean;
  agreementSigned: boolean;
  paymentReceived: boolean;
  eaConfirmed: boolean;
  readyToConvert: boolean;
}

export function getConversionReadiness(lead: {
  consultationStatus: string;
  agreementStatus: string;
  paymentStatus: string;
  eaConfirmedConversion: boolean;
}): ConversionReadiness {
  const consultationCompleted = lead.consultationStatus === "Completed";
  const agreementSigned = lead.agreementStatus === "Signed";
  const paymentReceived = lead.paymentStatus === "Paid";
  const eaConfirmed = lead.eaConfirmedConversion;

  return {
    consultationCompleted,
    agreementSigned,
    paymentReceived,
    eaConfirmed,
    readyToConvert: eaConfirmed, // EA confirmation is always required (spec section 11, 45)
  };
}

const DEFAULT_ONBOARDING_TASKS = [
  "Send welcome email",
  "Send agreement / confirm agreement",
  "Confirm payment",
  "Schedule first session / event",
  "Prepare client materials",
];

/**
 * Converts a lead to a client. Never runs automatically — the EA must have
 * explicitly confirmed (eaConfirmedConversion=true) before this is called
 * (spec section 9, 11, 45).
 */
export async function convertLeadToClient(leadId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    include: { contact: true },
  });

  if (!lead.eaConfirmedConversion) {
    throw new Error("EA confirmation is required before converting a lead to a client.");
  }

  if (lead.convertedToClientId) {
    return prisma.client.findUniqueOrThrow({ where: { id: lead.convertedToClientId } });
  }

  const drive = await createClientDriveStructure(`${lead.contact.firstName} ${lead.contact.lastName}`);

  const client = await prisma.client.create({
    data: {
      workspaceId: lead.workspaceId,
      contactId: lead.contactId,
      status: "active",
      startDate: new Date(),
      driveRootUrl: drive.rootUrl,
      nextAction: "Send welcome email",
      nextActionDue: new Date(),
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: "Ready for Conversion",
      convertedToClientId: client.id,
    },
  });

  await prisma.task.createMany({
    data: DEFAULT_ONBOARDING_TASKS.map((taskName) => ({
      workspaceId: lead.workspaceId,
      taskName,
      category: "Client",
      priority: "High",
      status: "To Do",
      relatedClientId: client.id,
      relatedContactId: lead.contactId,
      automationKey: `client:${client.id}:onboarding:${taskName}`,
    })),
  });

  await logActivity({
    workspaceId: lead.workspaceId,
    recordType: "client",
    recordId: client.id,
    eventType: "converted_from_lead",
    summary: `Converted from lead (${lead.id}); Drive folder ${drive.mocked ? "mocked" : "created"}`,
  });

  await logActivity({
    workspaceId: lead.workspaceId,
    recordType: "lead",
    recordId: leadId,
    eventType: "converted_to_client",
    summary: `Converted to client ${client.id}`,
  });

  return client;
}
