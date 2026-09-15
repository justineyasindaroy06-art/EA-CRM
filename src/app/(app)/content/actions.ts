"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function createContentAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") || "");
  const title = String(formData.get("title") || "").trim();
  if (!workspaceId || !title) throw new Error("Workspace and title are required");

  const dueDateRaw = String(formData.get("dueDate") || "");

  const item = await prisma.contentItem.create({
    data: {
      workspaceId,
      title,
      contentType: String(formData.get("contentType") || "Social Post"),
      platform: String(formData.get("platform") || "") || null,
      status: "Idea",
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      canvaUrl: String(formData.get("canvaUrl") || "") || null,
      capcutUrl: String(formData.get("capcutUrl") || "") || null,
      googleDriveUrl: String(formData.get("googleDriveUrl") || "") || null,
      clientId: String(formData.get("clientId") || "") || null,
    },
  });

  await logActivity({
    workspaceId,
    recordType: "content",
    recordId: item.id,
    eventType: "content_created",
    summary: `Content created: ${title}`,
  });

  revalidatePath("/content");
}

/** Updates content status; creates a publishing task when moved to Approved (spec section 16, idempotent). */
export async function updateContentStatusAction(contentId: string, status: string) {
  const item = await prisma.contentItem.update({ where: { id: contentId }, data: { status } });

  await logActivity({
    workspaceId: item.workspaceId,
    recordType: "content",
    recordId: contentId,
    eventType: "status_changed",
    summary: `Content "${item.title}" moved to ${status}`,
  });

  if (status === "Approved") {
    const existing = await prisma.task.findFirst({
      where: { automationKey: `content:${contentId}:publish` },
    });
    if (!existing) {
      await prisma.task.create({
        data: {
          workspaceId: item.workspaceId,
          taskName: `Publish: ${item.title}`,
          category: "Content",
          priority: "Medium",
          status: "To Do",
          dueDate: item.publishDate ?? item.dueDate,
          relatedContentId: contentId,
          automationKey: `content:${contentId}:publish`,
        },
      });
    }
  }

  revalidatePath("/content");
}

export async function updateContentNextActionAction(contentId: string, formData: FormData) {
  const nextAction = String(formData.get("nextAction") || "") || null;
  const nextActionDueRaw = String(formData.get("nextActionDue") || "");

  const item = await prisma.contentItem.update({
    where: { id: contentId },
    data: { nextAction, nextActionDue: nextActionDueRaw ? new Date(nextActionDueRaw) : null },
  });

  await logActivity({
    workspaceId: item.workspaceId,
    recordType: "content",
    recordId: contentId,
    eventType: "content_updated",
    summary: "Next action updated",
  });

  revalidatePath("/content");
}
