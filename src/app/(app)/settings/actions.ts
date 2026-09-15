"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { disconnectGoogle } from "@/lib/integrations/google-oauth";
import { runLeadFollowUpScheduler } from "@/lib/automations/scheduler";

export async function updateAutomationSettingsAction(formData: FormData) {
  const followUpDays = Number(formData.get("followUpDays") || 4);
  const finalDays = Number(formData.get("finalDays") || 10);

  await prisma.setting.upsert({
    where: { key: "automation_followup_days" },
    update: { value: JSON.stringify(followUpDays) },
    create: { key: "automation_followup_days", value: JSON.stringify(followUpDays) },
  });
  await prisma.setting.upsert({
    where: { key: "automation_final_days" },
    update: { value: JSON.stringify(finalDays) },
    create: { key: "automation_final_days", value: JSON.stringify(finalDays) },
  });

  revalidatePath("/settings");
}

export async function toggleEmailTemplateAction(templateId: string, enabled: boolean) {
  await prisma.emailTemplate.update({ where: { id: templateId }, data: { enabled } });
  revalidatePath("/settings");
}

export async function updateEmailTemplateAction(templateId: string, formData: FormData) {
  await prisma.emailTemplate.update({
    where: { id: templateId },
    data: {
      subject: String(formData.get("subject") || ""),
      body: String(formData.get("body") || ""),
    },
  });
  revalidatePath("/settings");
}

export async function createWorkspaceAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Workspace name is required");

  await prisma.workspace.create({
    data: {
      name,
      description: String(formData.get("description") || "") || null,
      googleDriveRootUrl: String(formData.get("googleDriveRootUrl") || "") || null,
    },
  });

  revalidatePath("/settings");
}

export async function updateWorkspaceStatusAction(workspaceId: string, status: string) {
  await prisma.workspace.update({ where: { id: workspaceId }, data: { status } });
  revalidatePath("/settings");
}

export async function disconnectGoogleAction() {
  await disconnectGoogle();
  revalidatePath("/settings");
}

/** Lets the EA manually trigger the scheduler from Settings (e.g. right after deploying, before the cron job's first run). */
export async function runSchedulerNowAction() {
  await runLeadFollowUpScheduler();
  revalidatePath("/settings");
}
