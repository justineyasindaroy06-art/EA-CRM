import { PrismaClient } from "@prisma/client";
import { addDays } from "../src/lib/dates";

const prisma = new PrismaClient();

const EMAIL_TEMPLATES = [
  {
    key: "lead_welcome",
    name: "New Lead Welcome",
    subject: "Thanks for reaching out, {{first_name}}!",
    body: "Hi {{first_name}},\n\nThanks for your interest! Here's the link to book a free consultation: {{booking_link}}\n\nTalk soon,\nThe Team",
  },
  {
    key: "lead_followup",
    name: "Lead Follow-up",
    subject: "Still interested, {{first_name}}?",
    body: "Hi {{first_name}},\n\nJust checking in — would love to help. Let me know if you'd like to schedule a time to chat.\n\nBest,\nThe Team",
  },
  {
    key: "lead_final_followup",
    name: "Lead Final Follow-up",
    subject: "One last note, {{first_name}}",
    body: "Hi {{first_name}},\n\nI haven't heard back, so I'll pause outreach for now. If your situation changes, just reply here — happy to help whenever you're ready.\n\nBest,\nThe Team",
  },
  {
    key: "client_welcome",
    name: "Client Welcome",
    subject: "Welcome aboard, {{first_name}}!",
    body: "Hi {{first_name}},\n\nExcited to get started! Here's your shared folder: {{drive_url}}\n\nTalk soon,\nThe Team",
  },
  {
    key: "invoice_sent",
    name: "Invoice Sent",
    subject: "Invoice {{invoice_number}}",
    body: "Hi {{first_name}},\n\nYour invoice {{invoice_number}} for {{amount}} is attached, due {{due_date}}.\n\nThanks,\nThe Team",
  },
  {
    key: "payment_reminder",
    name: "Payment Reminder",
    subject: "Reminder: Invoice {{invoice_number}} is due",
    body: "Hi {{first_name}},\n\nJust a friendly reminder that invoice {{invoice_number}} for {{amount}} is due {{due_date}}.\n\nThanks,\nThe Team",
  },
];

const DEFAULT_SETTINGS: Record<string, unknown> = {
  automation_followup_days: 4,
  automation_final_days: 10,
  default_currency: "USD",
  invoice_number_prefix: "INV-",
  default_billable: true,
};

async function main() {
  console.log("Seeding EA CRM demo data...");

  for (const t of EMAIL_TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { key: t.key },
      update: {},
      create: t,
    });
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: JSON.stringify(value) },
    });
  }

  const workspaceA = await prisma.workspace.create({
    data: {
      name: "Demo Client A",
      status: "active",
      description: "Fictional demo workspace for a coaching business.",
      googleDriveRootUrl: "https://drive.google.com/drive/folders/mock-demo-a",
    },
  });

  const workspaceB = await prisma.workspace.create({
    data: {
      name: "Demo Client B",
      status: "active",
      description: "Fictional demo workspace for a consulting business.",
      googleDriveRootUrl: "https://drive.google.com/drive/folders/mock-demo-b",
    },
  });

  const today = new Date();

  // --- Leads (5) -------------------------------------------------------
  const leadContacts = [
    { firstName: "Jordan", lastName: "Reyes", email: "jordan.reyes@example.com", workspaceId: workspaceA.id },
    { firstName: "Priya", lastName: "Nair", email: "priya.nair@example.com", workspaceId: workspaceA.id },
    { firstName: "Sam", lastName: "Okafor", email: "sam.okafor@example.com", workspaceId: workspaceB.id },
    { firstName: "Lena", lastName: "Kowalski", email: "lena.kowalski@example.com", workspaceId: workspaceB.id },
    { firstName: "Diego", lastName: "Morales", email: "diego.morales@example.com", workspaceId: workspaceA.id },
  ];

  const leadStatuses = ["New Lead", "Contacted", "Consultation Booked", "Nurture", "Agreement Sent"];

  for (let i = 0; i < leadContacts.length; i++) {
    const c = leadContacts[i];
    const contact = await prisma.contact.create({
      data: { ...c, company: "Demo Co", jobTitle: "Founder" },
    });
    await prisma.lead.create({
      data: {
        workspaceId: c.workspaceId,
        contactId: contact.id,
        status: leadStatuses[i],
        source: "Website Form",
        interestedIn: "1:1 coaching",
        serviceOrProgram: "Executive Coaching Package",
        biggestChallenge: "Not enough time in the day",
        desiredResult: "More structured operations",
        nextAction: "Follow up about consultation",
        nextActionDue: addDays(today, i - 1),
        consultationRequested: true,
      },
    });
  }

  // --- Clients (3) -------------------------------------------------------
  const clientContacts = [
    { firstName: "Morgan", lastName: "Ellis", email: "morgan.ellis@example.com", workspaceId: workspaceA.id },
    { firstName: "Aisha", lastName: "Bello", email: "aisha.bello@example.com", workspaceId: workspaceA.id },
    { firstName: "Noah", lastName: "Fischer", email: "noah.fischer@example.com", workspaceId: workspaceB.id },
  ];

  const pkgA = await prisma.package.create({
    data: {
      workspaceId: workspaceA.id,
      name: "Executive Coaching — Quarterly",
      description: "12-week 1:1 coaching engagement",
      price: 3000,
      duration: "12 weeks",
      packageType: "Coaching",
    },
  });

  const pkgB = await prisma.package.create({
    data: {
      workspaceId: workspaceB.id,
      name: "Ops Consulting Retainer",
      description: "Monthly ops consulting retainer",
      price: 1500,
      duration: "Monthly",
      packageType: "Consulting",
    },
  });

  const clients = [];
  for (let i = 0; i < clientContacts.length; i++) {
    const c = clientContacts[i];
    const contact = await prisma.contact.create({
      data: { ...c, company: "Demo Co", jobTitle: "CEO" },
    });
    const client = await prisma.client.create({
      data: {
        workspaceId: c.workspaceId,
        contactId: contact.id,
        status: "active",
        clientType: "Coaching",
        startDate: addDays(today, -30 + i * 5),
        nextAction: i === 0 ? "Send onboarding materials" : "Prepare session notes",
        nextActionDue: addDays(today, i),
        driveRootUrl: `https://drive.google.com/drive/folders/mock-client-${i}`,
      },
    });
    clients.push(client);
    await prisma.clientPackage.create({
      data: {
        clientId: client.id,
        packageId: c.workspaceId === workspaceA.id ? pkgA.id : pkgB.id,
        startDate: addDays(today, -30),
        status: "active",
      },
    });
  }

  // --- Tasks (8) -----------------------------------------------------------
  const taskDefs = [
    { taskName: "Send onboarding materials", category: "Client", priority: "High", status: "To Do", dueDate: today, relatedClientId: clients[0].id },
    { taskName: "Prepare session notes", category: "Client", priority: "Medium", status: "To Do", dueDate: addDays(today, 1), relatedClientId: clients[1].id },
    { taskName: "Follow up on invoice", category: "Billing", priority: "High", status: "To Do", dueDate: addDays(today, -2), relatedClientId: clients[2].id },
    { taskName: "Review content calendar", category: "Content", priority: "Medium", status: "In Progress", dueDate: addDays(today, 2) },
    { taskName: "Schedule discovery call", category: "Lead", priority: "Medium", status: "To Do", dueDate: today },
    { taskName: "Confirm meeting agenda", category: "Meeting", priority: "Low", status: "Waiting", waitingOn: "Client", followUpDate: addDays(today, 3) },
    { taskName: "Update client Drive folder", category: "Admin", priority: "Low", status: "Done", dueDate: addDays(today, -5), completedAt: addDays(today, -5) },
    { taskName: "Draft Q3 report", category: "Admin", priority: "Medium", status: "To Do", dueDate: addDays(today, 5) },
  ];

  for (const t of taskDefs) {
    await prisma.task.create({
      data: { workspaceId: workspaceA.id, ...t } as never,
    });
  }

  // --- Meetings (4) ----------------------------------------------------
  const meetingDefs = [
    { title: "Discovery Call — Jordan Reyes", start: addDays(today, 0), clientId: null },
    { title: "Coaching Session — Morgan Ellis", start: addDays(today, 1), clientId: clients[0].id },
    { title: "Strategy Session — Aisha Bello", start: addDays(today, 3), clientId: clients[1].id },
    { title: "Consulting Check-in — Noah Fischer", start: addDays(today, -2), clientId: clients[2].id, status: "Completed" },
  ];

  for (const m of meetingDefs) {
    const startAt = new Date(m.start);
    startAt.setHours(14, 0, 0, 0);
    const endAt = new Date(startAt);
    endAt.setMinutes(endAt.getMinutes() + 45);
    await prisma.meeting.create({
      data: {
        workspaceId: m.clientId ? clients.find((c) => c.id === m.clientId)!.workspaceId : workspaceA.id,
        clientId: m.clientId,
        title: m.title,
        meetingType: m.clientId ? "Session" : "Consultation",
        googleMeetUrl: "https://meet.google.com/mock-demo",
        startAt,
        endAt,
        status: m.status ?? "Scheduled",
      },
    });
  }

  // --- Content (6) -------------------------------------------------------
  const contentDefs = [
    { title: "LinkedIn post — client win story", platform: "LinkedIn", status: "Idea" },
    { title: "Instagram reel — behind the scenes", platform: "Instagram", status: "Draft" },
    { title: "Website testimonial graphic", platform: "Website", status: "Design" },
    { title: "Facebook ad — new offer", platform: "Facebook", status: "Review" },
    { title: "LinkedIn carousel — 5 tips", platform: "LinkedIn", status: "Approved" },
    { title: "Instagram post — quote graphic", platform: "Instagram", status: "Scheduled" },
  ];

  for (const c of contentDefs) {
    await prisma.contentItem.create({
      data: {
        workspaceId: workspaceA.id,
        title: c.title,
        contentType: "Social Post",
        platform: c.platform,
        status: c.status,
        dueDate: addDays(today, 3),
        nextAction: c.status === "Review" ? "Send design to CEO for approval" : null,
        nextActionDue: c.status === "Review" ? addDays(today, 1) : null,
      },
    });
  }

  // --- Invoices (3) + Payments (3) --------------------------------------
  const invoice1 = await prisma.invoice.create({
    data: {
      workspaceId: workspaceA.id,
      clientId: clients[0].id,
      packageId: pkgA.id,
      invoiceNumber: "INV-1001",
      invoiceDate: addDays(today, -20),
      dueDate: addDays(today, -5),
      amount: 3000,
      status: "Sent",
    },
  });
  await prisma.payment.create({
    data: {
      workspaceId: workspaceA.id,
      invoiceId: invoice1.id,
      clientId: clients[0].id,
      amount: 1500,
      paymentDate: addDays(today, -10),
      paymentMethod: "Bank Transfer",
    },
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      workspaceId: workspaceA.id,
      clientId: clients[1].id,
      packageId: pkgA.id,
      invoiceNumber: "INV-1002",
      invoiceDate: addDays(today, -3),
      dueDate: addDays(today, 11),
      amount: 3000,
      status: "Sent",
    },
  });
  await prisma.payment.create({
    data: {
      workspaceId: workspaceA.id,
      invoiceId: invoice2.id,
      clientId: clients[1].id,
      amount: 3000,
      paymentDate: addDays(today, -1),
      paymentMethod: "Card",
    },
  });

  const invoice3 = await prisma.invoice.create({
    data: {
      workspaceId: workspaceB.id,
      clientId: clients[2].id,
      packageId: pkgB.id,
      invoiceNumber: "INV-2001",
      invoiceDate: addDays(today, -40),
      dueDate: addDays(today, -25),
      amount: 1500,
      status: "Sent",
    },
  });
  await prisma.payment.create({
    data: {
      workspaceId: workspaceB.id,
      invoiceId: invoice3.id,
      clientId: clients[2].id,
      amount: 750,
      paymentDate: addDays(today, -30),
      paymentMethod: "Bank Transfer",
    },
  });

  // --- Time entries --------------------------------------------------------
  for (let i = 0; i < 5; i++) {
    const startAt = addDays(today, -i);
    startAt.setHours(9, 0, 0, 0);
    const endAt = new Date(startAt);
    endAt.setMinutes(endAt.getMinutes() + 30 + i * 10);
    await prisma.timeEntry.create({
      data: {
        workspaceId: clients[i % clients.length].workspaceId,
        clientId: clients[i % clients.length].id,
        project: "Ongoing support",
        startAt,
        endAt,
        duration: Math.floor((endAt.getTime() - startAt.getTime()) / 1000),
        billable: i % 2 === 0,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
