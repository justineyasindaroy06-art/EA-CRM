"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { runLeadDay0Automation, runLeadFollowUpCheck } from "@/lib/automations/lead-automation";
import { convertLeadToClient } from "@/lib/automations/conversion";

export async function createLeadAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") || "");
  if (!workspaceId) throw new Error("Workspace is required");

  const email = String(formData.get("email") || "").toLowerCase().trim();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  if (!email || !firstName || !lastName) {
    throw new Error("First name, last name, and email are required");
  }

  let contact = await prisma.contact.findFirst({ where: { workspaceId, email } });
  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        workspaceId,
        firstName,
        lastName,
        email,
        phone: String(formData.get("phone") || "") || null,
        company: String(formData.get("company") || "") || null,
      },
    });
  }

  const lead = await prisma.lead.create({
    data: {
      workspaceId,
      contactId: contact.id,
      status: "New Lead",
      source: String(formData.get("source") || "Manual Entry"),
      serviceOrProgram: String(formData.get("serviceOrProgram") || "") || null,
      notes: String(formData.get("notes") || "") || null,
    },
  });

  await logActivity({
    workspaceId,
    recordType: "lead",
    recordId: lead.id,
    eventType: "lead_created",
    summary: `Lead created manually for ${firstName} ${lastName}`,
  });

  await runLeadDay0Automation(lead.id);

  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLeadStatusAction(leadId: string, status: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  await prisma.lead.update({ where: { id: leadId }, data: { status } });
  await logActivity({
    workspaceId: lead.workspaceId,
    recordType: "lead",
    recordId: leadId,
    eventType: "status_changed",
    summary: `Status changed from "${lead.status}" to "${status}"`,
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}

export async function updateLeadFieldsAction(leadId: string, formData: FormData) {
  const nextAction = String(formData.get("nextAction") || "") || null;
  const nextActionDueRaw = String(formData.get("nextActionDue") || "");
  const notes = String(formData.get("notes") || "") || null;
  const consultationStatus = String(formData.get("consultationStatus") || "") || undefined;
  const agreementStatus = String(formData.get("agreementStatus") || "") || undefined;
  const paymentStatus = String(formData.get("paymentStatus") || "") || undefined;

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      nextAction,
      nextActionDue: nextActionDueRaw ? new Date(nextActionDueRaw) : null,
      notes,
      ...(consultationStatus ? { consultationStatus } : {}),
      ...(agreementStatus ? { agreementStatus } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
    },
  });

  await logActivity({
    workspaceId: lead.workspaceId,
    recordType: "lead",
    recordId: leadId,
    eventType: "lead_updated",
    summary: "Lead details updated",
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function confirmEaConversionAction(leadId: string, confirmed: boolean) {
  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { eaConfirmedConversion: confirmed },
  });
  await logActivity({
    workspaceId: lead.workspaceId,
    recordType: "lead",
    recordId: leadId,
    eventType: "ea_confirmation_changed",
    summary: `EA confirmation set to ${confirmed}`,
  });
  revalidatePath(`/leads/${leadId}`);
}

export async function convertLeadAction(leadId: string) {
  const client = await convertLeadToClient(leadId);
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function runAutomationCheckAction(leadId: string) {
  await runLeadFollowUpCheck(leadId);
  revalidatePath(`/leads/${leadId}`);
}

export async function getLeadFormWorkspaces() {
  return prisma.workspace.findMany({ orderBy: { name: "asc" } });
}
