"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function createTaskAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") || "");
  const taskName = String(formData.get("taskName") || "").trim();
  if (!workspaceId || !taskName) throw new Error("Workspace and task name are required");

  const dueDateRaw = String(formData.get("dueDate") || "");
  const followUpDateRaw = String(formData.get("followUpDate") || "");

  const task = await prisma.task.create({
    data: {
      workspaceId,
      taskName,
      category: String(formData.get("category") || "Admin"),
      priority: String(formData.get("priority") || "Medium"),
      status: String(formData.get("status") || "To Do"),
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      waitingOn: String(formData.get("waitingOn") || "") || null,
      followUpDate: followUpDateRaw ? new Date(followUpDateRaw) : null,
      notes: String(formData.get("notes") || "") || null,
      relatedClientId: String(formData.get("relatedClientId") || "") || null,
      relatedLeadId: String(formData.get("relatedLeadId") || "") || null,
    },
  });

  await logActivity({
    workspaceId,
    recordType: "task",
    recordId: task.id,
    eventType: "task_created",
    summary: `Task created: ${taskName}`,
  });

  revalidatePath("/tasks");
}

export async function updateTaskStatusAction(taskId: string, status: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status, completedAt: status === "Done" ? new Date() : null },
  });

  await logActivity({
    workspaceId: task.workspaceId,
    recordType: "task",
    recordId: taskId,
    eventType: "status_changed",
    summary: `Task "${task.taskName}" marked ${status}`,
  });

  revalidatePath("/tasks");
}

export async function deleteTaskAction(taskId: string) {
  const task = await prisma.task.delete({ where: { id: taskId } });
  await logActivity({
    workspaceId: task.workspaceId,
    recordType: "task",
    recordId: taskId,
    eventType: "task_deleted",
    summary: `Task deleted: ${task.taskName}`,
  });
  revalidatePath("/tasks");
}
