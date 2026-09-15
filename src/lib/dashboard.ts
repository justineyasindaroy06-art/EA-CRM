import { prisma } from "./prisma";
import { startOfToday, endOfToday } from "./dates";
import { invoiceBalance } from "./billing";

export async function getDashboardData(workspaceId: string | null) {
  const scope = workspaceId ? { workspaceId } : {};
  const today0 = startOfToday();
  const today1 = endOfToday();

  const [
    tasksDueToday,
    meetingsToday,
    followUpsDue,
    overdueTasks,
    overdueInvoices,
    newLeads,
    consultationsBooked,
    activeClients,
    contentAwaiting,
    activeTimer,
    outstandingInvoices,
  ] = await Promise.all([
    prisma.task.findMany({
      where: { ...scope, status: { not: "Done" }, dueDate: { gte: today0, lte: today1 } },
      orderBy: { priority: "desc" },
    }),
    prisma.meeting.findMany({
      where: { ...scope, status: "Scheduled", startAt: { gte: today0, lte: today1 } },
      include: {
        client: { include: { contact: true } },
        lead: { include: { contact: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.lead.findMany({
      where: { ...scope, nextFollowUpAt: { lte: today1 }, status: { notIn: ["Lost / Disqualified", "Nurture"] } },
      include: { contact: true },
    }),
    prisma.task.findMany({
      where: { ...scope, status: { not: "Done" }, dueDate: { lt: today0 } },
      include: { client: { include: { contact: true } }, lead: { include: { contact: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.invoice.findMany({
      where: { ...scope, status: { notIn: ["Paid", "Cancelled", "Draft"] }, dueDate: { lt: today0 } },
      include: { client: { include: { contact: true } }, payments: true },
    }),
    prisma.lead.findMany({
      where: { ...scope, status: "New Lead" },
      include: { contact: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.lead.findMany({
      where: { ...scope, status: "Consultation Booked" },
      include: { contact: true },
    }),
    prisma.client.findMany({
      where: { ...scope, status: "active" },
      include: { contact: true, clientPackages: { include: { package: true }, where: { status: "active" } } },
      orderBy: { nextActionDue: "asc" },
    }),
    prisma.contentItem.findMany({
      where: { ...scope, status: { in: ["Review", "Approved"] } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.timeEntry.findFirst({
      where: { ...scope, endAt: null },
      include: { client: { include: { contact: true } } },
      orderBy: { startAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: { ...scope, status: { notIn: ["Paid", "Cancelled", "Draft"] } },
      include: { payments: true },
    }),
  ]);

  const contentDueSoon = await prisma.contentItem.findMany({
    where: { ...scope, status: { notIn: ["Published"] }, dueDate: { gte: today0, lte: new Date(today1.getTime() + 7 * 86400000) } },
    orderBy: { dueDate: "asc" },
  });
  const contentOverdue = await prisma.contentItem.findMany({
    where: { ...scope, status: { notIn: ["Published"] }, dueDate: { lt: today0 } },
  });
  const contentScheduled = await prisma.contentItem.findMany({
    where: { ...scope, status: "Scheduled" },
  });

  const outstandingAmount = outstandingInvoices.reduce((sum, inv) => sum + invoiceBalance(inv), 0);
  const overdueInvoiceCount = overdueInvoices.length;

  const needsAttention = [
    ...overdueTasks.map((t) => ({
      what: `Overdue: ${t.taskName}`,
      who: t.client ? `${t.client.contact.firstName} ${t.client.contact.lastName}` : t.lead ? `${t.lead.contact.firstName} ${t.lead.contact.lastName}` : null,
      href: `/tasks?highlight=${t.id}`,
    })),
    ...followUpsDue.map((l) => ({
      what: "Lead follow-up due",
      who: `${l.contact.firstName} ${l.contact.lastName}`,
      href: `/leads/${l.id}`,
    })),
    ...overdueInvoices.map((inv) => ({
      what: `Invoice overdue: ${inv.invoiceNumber}`,
      who: `${inv.client.contact.firstName} ${inv.client.contact.lastName}`,
      href: `/billing?highlight=${inv.id}`,
    })),
    ...contentAwaiting.map((c) => ({
      what: `Content awaiting approval: ${c.title}`,
      who: null,
      href: `/content?highlight=${c.id}`,
    })),
  ];

  return {
    tasksDueToday,
    meetingsToday,
    followUpsDue,
    overdueTasks,
    newLeads,
    consultationsBooked,
    activeClients,
    contentAwaitingApproval: contentAwaiting,
    contentDueSoon,
    contentOverdue,
    contentScheduled,
    activeTimer,
    outstandingAmount,
    overdueInvoiceCount,
    invoicesDueCount: outstandingInvoices.length,
    needsAttention,
  };
}
