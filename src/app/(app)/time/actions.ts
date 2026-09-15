"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function startTimerAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") || "");
  if (!workspaceId) throw new Error("Workspace is required");

  const existing = await prisma.timeEntry.findFirst({ where: { endAt: null } });
  if (existing) {
    throw new Error("A timer is already running. Stop it before starting a new one.");
  }

  await prisma.timeEntry.create({
    data: {
      workspaceId,
      clientId: String(formData.get("clientId") || "") || null,
      project: String(formData.get("project") || "") || null,
      startAt: new Date(),
      billable: formData.get("billable") === "on",
    },
  });

  revalidatePath("/time");
}

export async function stopTimerAction(entryId: string) {
  const entry = await prisma.timeEntry.findUniqueOrThrow({ where: { id: entryId } });
  const endAt = new Date();
  const duration = Math.max(0, Math.floor((endAt.getTime() - entry.startAt.getTime()) / 1000));

  await prisma.timeEntry.update({
    where: { id: entryId },
    data: { endAt, duration },
  });

  await logActivity({
    workspaceId: entry.workspaceId,
    recordType: "time_entry",
    recordId: entryId,
    eventType: "timer_stopped",
    summary: `Timer stopped (${Math.round(duration / 60)} min)`,
  });

  revalidatePath("/time");
}

export async function createManualEntryAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") || "");
  const startAtRaw = String(formData.get("startAt") || "");
  const endAtRaw = String(formData.get("endAt") || "");
  if (!workspaceId || !startAtRaw || !endAtRaw) throw new Error("Workspace, start, and end time are required");

  const startAt = new Date(startAtRaw);
  const endAt = new Date(endAtRaw);
  const duration = Math.max(0, Math.floor((endAt.getTime() - startAt.getTime()) / 1000));

  await prisma.timeEntry.create({
    data: {
      workspaceId,
      clientId: String(formData.get("clientId") || "") || null,
      project: String(formData.get("project") || "") || null,
      startAt,
      endAt,
      duration,
      billable: formData.get("billable") === "on",
      notes: String(formData.get("notes") || "") || null,
    },
  });

  revalidatePath("/time");
}

export async function deleteEntryAction(entryId: string) {
  await prisma.timeEntry.delete({ where: { id: entryId } });
  revalidatePath("/time");
}
