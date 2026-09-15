"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { createCalendarEvent, getCalendarEvent } from "@/lib/integrations/google-calendar";
import { isTestMode, googleConfigured } from "@/lib/integrations/types";

export async function createMeetingAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") || "");
  const title = String(formData.get("title") || "").trim();
  const startAtRaw = String(formData.get("startAt") || "");
  const durationMinutes = Number(formData.get("durationMinutes") || 45);
  if (!workspaceId || !title || !startAtRaw) throw new Error("Workspace, title, and start time are required");

  const startAt = new Date(startAtRaw);
  const endAt = new Date(startAt.getTime() + durationMinutes * 60000);

  const event = await createCalendarEvent({ title, startAt, endAt });

  const meeting = await prisma.meeting.create({
    data: {
      workspaceId,
      title,
      meetingType: String(formData.get("meetingType") || "Session"),
      clientId: String(formData.get("clientId") || "") || null,
      leadId: String(formData.get("leadId") || "") || null,
      startAt,
      endAt,
      externalCalendarEventId: event.externalCalendarEventId,
      googleMeetUrl: event.googleMeetUrl,
      status: "Scheduled",
    },
  });

  await logActivity({
    workspaceId,
    recordType: "meeting",
    recordId: meeting.id,
    eventType: "meeting_created",
    summary: `Meeting scheduled: ${title}${event.mocked ? " (mock calendar event)" : ""}`,
  });

  revalidatePath("/calendar");
}

export async function completeMeetingAction(meetingId: string, formData: FormData) {
  const notes = String(formData.get("notes") || "") || null;
  const nextAction = String(formData.get("nextAction") || "") || null;
  const nextActionDueRaw = String(formData.get("nextActionDue") || "");
  const createFollowUp = formData.get("createFollowUp") === "on";

  const meeting = await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      status: "Completed",
      notes,
      nextAction,
      nextActionDue: nextActionDueRaw ? new Date(nextActionDueRaw) : null,
    },
  });

  if (createFollowUp && nextAction) {
    await prisma.task.create({
      data: {
        workspaceId: meeting.workspaceId,
        taskName: nextAction,
        category: "Meeting",
        priority: "Medium",
        status: "To Do",
        dueDate: nextActionDueRaw ? new Date(nextActionDueRaw) : null,
        relatedMeetingId: meeting.id,
        relatedClientId: meeting.clientId,
        relatedLeadId: meeting.leadId,
      },
    });
  }

  await logActivity({
    workspaceId: meeting.workspaceId,
    recordType: "meeting",
    recordId: meetingId,
    eventType: "meeting_completed",
    summary: `Meeting completed: ${meeting.title}`,
  });

  revalidatePath("/calendar");
}

/**
 * Pulls the current status/Meet link for a meeting straight from Google
 * Calendar (production-readiness item 2: "read calendar events",
 * "identify Google Meet links when available", "associate meetings with
 * the appropriate lead/client"). Only meaningful once Google is really
 * connected — no-ops in mock mode since there's no real event to fetch.
 */
export async function syncMeetingFromGoogleAction(meetingId: string) {
  if (isTestMode() || !googleConfigured()) {
    return { synced: false, reason: "mock_mode" as const };
  }

  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  if (!meeting.externalCalendarEventId || meeting.externalCalendarEventId.startsWith("mock_event_")) {
    return { synced: false, reason: "no_real_event" as const };
  }

  const event = await getCalendarEvent(meeting.externalCalendarEventId);

  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      googleMeetUrl: event.googleMeetUrl ?? meeting.googleMeetUrl,
      status: event.status === "cancelled" ? "Cancelled" : meeting.status,
    },
  });

  await logActivity({
    workspaceId: meeting.workspaceId,
    recordType: "meeting",
    recordId: meetingId,
    eventType: "meeting_synced",
    summary: `Synced latest status from Google Calendar (${event.status})`,
  });

  revalidatePath("/calendar");
  return { synced: true, event };
}

export async function cancelMeetingAction(meetingId: string) {
  const meeting = await prisma.meeting.update({ where: { id: meetingId }, data: { status: "Cancelled" } });
  await logActivity({
    workspaceId: meeting.workspaceId,
    recordType: "meeting",
    recordId: meetingId,
    eventType: "meeting_cancelled",
    summary: `Meeting cancelled: ${meeting.title}`,
  });
  revalidatePath("/calendar");
}
