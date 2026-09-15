import { prisma } from "../prisma";
import { logActivity } from "../activity";
import { sendAutomationEmail } from "../integrations/email";
import { addDays, daysBetween } from "../dates";

const AUTOMATION_NAME = {
  DAY0: "lead_day0_welcome",
  FOLLOWUP: "lead_followup",
  FINAL: "lead_final_followup",
  NURTURE: "lead_nurture_transition",
};

async function getFollowUpDays(): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { key: "automation_followup_days" } });
  return setting ? Number(JSON.parse(setting.value)) : 4;
}

async function getFinalDays(): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { key: "automation_final_days" } });
  return setting ? Number(JSON.parse(setting.value)) : 10;
}

async function getBookingLink(): Promise<string> {
  return process.env.BOOKING_LINK_URL || "https://calendar.google.com/your-booking-link";
}

async function automationAlreadyRan(workspaceId: string, name: string, leadId: string) {
  const existing = await prisma.automationRun.findFirst({
    where: {
      workspaceId,
      automationName: name,
      relatedRecordType: "lead",
      relatedRecordId: leadId,
      status: { in: ["success", "skipped"] },
    },
  });
  return Boolean(existing);
}

/**
 * Day 0 workflow (spec section 10): runs immediately after a lead is
 * created. Idempotent — safe to call more than once for the same lead.
 */
export async function runLeadDay0Automation(leadId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    include: { contact: true },
  });

  if (await automationAlreadyRan(lead.workspaceId, AUTOMATION_NAME.DAY0, leadId)) {
    return { ran: false, reason: "already_ran" as const };
  }

  const followUpDays = await getFollowUpDays();
  const bookingLink = await getBookingLink();

  await sendAutomationEmail({
    workspaceId: lead.workspaceId,
    templateKey: "lead_welcome",
    to: lead.contact.email,
    variables: {
      first_name: lead.contact.firstName,
      booking_link: bookingLink,
    },
    relatedRecordType: "lead",
    relatedRecordId: leadId,
  });

  await prisma.automationRun.create({
    data: {
      workspaceId: lead.workspaceId,
      automationName: AUTOMATION_NAME.DAY0,
      relatedRecordType: "lead",
      relatedRecordId: leadId,
      status: "success",
    },
  });

  const nextFollowUpAt = addDays(new Date(), followUpDays);

  const existingTask = await prisma.task.findFirst({
    where: { automationKey: `lead:${leadId}:followup` },
  });
  if (!existingTask) {
    await prisma.task.create({
      data: {
        workspaceId: lead.workspaceId,
        taskName: `Follow up with ${lead.contact.firstName} ${lead.contact.lastName}`,
        category: "Lead",
        priority: "Medium",
        status: "To Do",
        dueDate: nextFollowUpAt,
        relatedLeadId: leadId,
        relatedContactId: lead.contactId,
        nextAction: "Check for response / booking, follow up if needed",
        automationKey: `lead:${leadId}:followup`,
      },
    });
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      lastContactedAt: new Date(),
      nextFollowUpAt,
      nextAction: "Await response / booking",
      nextActionDue: nextFollowUpAt,
    },
  });

  await logActivity({
    workspaceId: lead.workspaceId,
    recordType: "lead",
    recordId: leadId,
    eventType: "day0_automation",
    summary: "Welcome email and booking link sent; follow-up task created",
  });

  return { ran: true };
}

/**
 * Follow-up check (spec section 10): decides whether the lead needs a Day
 * 3-5 follow-up, the Day 10 final follow-up + nurture transition, or nothing
 * yet. Designed to be called opportunistically (e.g. when a lead is viewed)
 * or from a manual "Run automation check" action — idempotent either way.
 */
export async function runLeadFollowUpCheck(leadId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId }, include: { contact: true } });

  // Only active-pipeline leads are subject to sales follow-up automation.
  const activeStatuses = ["New Lead", "Contacted"];
  if (!activeStatuses.includes(lead.status)) {
    return { ran: false, reason: "not_active_pipeline" as const };
  }

  const followUpDays = await getFollowUpDays();
  const finalDays = await getFinalDays();
  const ageDays = daysBetween(lead.createdAt, new Date());

  if (ageDays >= finalDays) {
    if (await automationAlreadyRan(lead.workspaceId, AUTOMATION_NAME.FINAL, leadId)) {
      return { ran: false, reason: "already_ran" as const };
    }

    await sendAutomationEmail({
      workspaceId: lead.workspaceId,
      templateKey: "lead_final_followup",
      to: lead.contact.email,
      variables: { first_name: lead.contact.firstName },
      relatedRecordType: "lead",
      relatedRecordId: leadId,
    });

    await prisma.automationRun.create({
      data: {
        workspaceId: lead.workspaceId,
        automationName: AUTOMATION_NAME.FINAL,
        relatedRecordType: "lead",
        relatedRecordId: leadId,
        status: "success",
      },
    });

    const existingTask = await prisma.task.findFirst({
      where: { automationKey: `lead:${leadId}:review` },
    });
    if (!existingTask) {
      await prisma.task.create({
        data: {
          workspaceId: lead.workspaceId,
          taskName: `Review lead: ${lead.contact.firstName} ${lead.contact.lastName}`,
          category: "Lead",
          priority: "Low",
          status: "To Do",
          relatedLeadId: leadId,
          relatedContactId: lead.contactId,
          nextAction: "Decide: move to nurture or keep pursuing",
          automationKey: `lead:${leadId}:review`,
        },
      });
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "Nurture",
        nextAction: "Include in nurture content / offers",
        nextActionDue: null,
      },
    });

    await prisma.automationRun.create({
      data: {
        workspaceId: lead.workspaceId,
        automationName: AUTOMATION_NAME.NURTURE,
        relatedRecordType: "lead",
        relatedRecordId: leadId,
        status: "success",
      },
    });

    await logActivity({
      workspaceId: lead.workspaceId,
      recordType: "lead",
      recordId: leadId,
      eventType: "final_followup_and_nurture",
      summary: "Final follow-up email sent; lead moved to Nurture",
    });

    return { ran: true, transition: "nurture" as const };
  }

  if (ageDays >= followUpDays) {
    if (await automationAlreadyRan(lead.workspaceId, AUTOMATION_NAME.FOLLOWUP, leadId)) {
      return { ran: false, reason: "already_ran" as const };
    }

    const existingTask = await prisma.task.findFirst({
      where: { automationKey: `lead:${leadId}:followup`, status: { not: "Done" } },
    });

    if (!existingTask) {
      await prisma.task.create({
        data: {
          workspaceId: lead.workspaceId,
          taskName: `Follow up with ${lead.contact.firstName} ${lead.contact.lastName}`,
          category: "Lead",
          priority: "Medium",
          status: "To Do",
          dueDate: new Date(),
          relatedLeadId: leadId,
          relatedContactId: lead.contactId,
          nextAction: "No response yet — send follow-up",
          automationKey: `lead:${leadId}:followup2`,
        },
      });
    }

    await sendAutomationEmail({
      workspaceId: lead.workspaceId,
      templateKey: "lead_followup",
      to: lead.contact.email,
      variables: { first_name: lead.contact.firstName },
      relatedRecordType: "lead",
      relatedRecordId: leadId,
    });

    await prisma.automationRun.create({
      data: {
        workspaceId: lead.workspaceId,
        automationName: AUTOMATION_NAME.FOLLOWUP,
        relatedRecordType: "lead",
        relatedRecordId: leadId,
        status: "success",
      },
    });

    await logActivity({
      workspaceId: lead.workspaceId,
      recordType: "lead",
      recordId: leadId,
      eventType: "followup_automation",
      summary: "Day 3-5 follow-up email sent and task created",
    });

    return { ran: true, transition: "followup" as const };
  }

  return { ran: false, reason: "not_due_yet" as const };
}
