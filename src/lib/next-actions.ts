import { prisma } from "./prisma";

export interface NextActionItem {
  id: string;
  recordType: "lead" | "client" | "task" | "meeting" | "content" | "invoice";
  what: string;
  workspaceName: string;
  workspaceId: string;
  dueDate: Date | null;
  status: string;
  priority?: string;
  href: string;
}

/**
 * Aggregates Next Action items across Leads, Clients, Tasks, Meetings,
 * Content, and Billing into one universal feed (spec section 4, 14).
 */
export async function getUniversalNextActions(workspaceId: string | null): Promise<NextActionItem[]> {
  const scope = workspaceId ? { workspaceId } : {};

  const [leads, clients, tasks, meetings, content, invoices] = await Promise.all([
    prisma.lead.findMany({
      where: { ...scope, nextAction: { not: null }, status: { notIn: ["Lost / Disqualified"] } },
      include: { workspace: true, contact: true },
    }),
    prisma.client.findMany({
      where: { ...scope, nextAction: { not: null }, status: "active" },
      include: { workspace: true, contact: true },
    }),
    prisma.task.findMany({
      where: { ...scope, status: { notIn: ["Done"] } },
      include: { workspace: true },
    }),
    prisma.meeting.findMany({
      where: { ...scope, status: "Scheduled", nextAction: { not: null } },
      include: { workspace: true },
    }),
    prisma.contentItem.findMany({
      where: { ...scope, nextAction: { not: null }, status: { notIn: ["Published"] } },
      include: { workspace: true },
    }),
    prisma.invoice.findMany({
      where: { ...scope, status: { in: ["Sent", "Overdue", "Partially Paid"] } },
      include: { workspace: true, client: { include: { contact: true } } },
    }),
  ]);

  const items: NextActionItem[] = [];

  for (const lead of leads) {
    items.push({
      id: lead.id,
      recordType: "lead",
      what: lead.nextAction!,
      workspaceName: lead.workspace.name,
      workspaceId: lead.workspaceId,
      dueDate: lead.nextActionDue,
      status: lead.status,
      href: `/leads/${lead.id}`,
    });
  }

  for (const client of clients) {
    items.push({
      id: client.id,
      recordType: "client",
      what: client.nextAction!,
      workspaceName: client.workspace.name,
      workspaceId: client.workspaceId,
      dueDate: client.nextActionDue,
      status: client.status,
      href: `/clients/${client.id}`,
    });
  }

  for (const task of tasks) {
    items.push({
      id: task.id,
      recordType: "task",
      what: task.taskName,
      workspaceName: task.workspace.name,
      workspaceId: task.workspaceId,
      dueDate: task.dueDate,
      status: task.status,
      priority: task.priority,
      href: `/tasks?highlight=${task.id}`,
    });
  }

  for (const meeting of meetings) {
    items.push({
      id: meeting.id,
      recordType: "meeting",
      what: meeting.nextAction!,
      workspaceName: meeting.workspace.name,
      workspaceId: meeting.workspaceId,
      dueDate: meeting.nextActionDue,
      status: meeting.status,
      href: `/calendar?highlight=${meeting.id}`,
    });
  }

  for (const item of content) {
    items.push({
      id: item.id,
      recordType: "content",
      what: item.nextAction!,
      workspaceName: item.workspace.name,
      workspaceId: item.workspaceId,
      dueDate: item.nextActionDue,
      status: item.status,
      href: `/content?highlight=${item.id}`,
    });
  }

  for (const invoice of invoices) {
    items.push({
      id: invoice.id,
      recordType: "invoice",
      what: `Follow up on invoice ${invoice.invoiceNumber} (${invoice.client.contact.firstName} ${invoice.client.contact.lastName})`,
      workspaceName: invoice.workspace.name,
      workspaceId: invoice.workspaceId,
      dueDate: invoice.dueDate,
      status: invoice.status,
      href: `/billing?highlight=${invoice.id}`,
    });
  }

  // Sort: overdue/undated-urgent first, then soonest due date.
  items.sort((a, b) => {
    const aTime = a.dueDate ? a.dueDate.getTime() : Infinity;
    const bTime = b.dueDate ? b.dueDate.getTime() : Infinity;
    return aTime - bTime;
  });

  return items;
}
