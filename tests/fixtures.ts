import { prisma } from "@/lib/prisma";

export async function createWorkspace(name = "Test Workspace") {
  return prisma.workspace.create({ data: { name } });
}

export async function createLeadWithContact(workspaceId: string, overrides: Partial<{ email: string; createdAt: Date }> = {}) {
  const contact = await prisma.contact.create({
    data: {
      workspaceId,
      firstName: "Test",
      lastName: "Lead",
      email: overrides.email ?? "test.lead@example.com",
    },
  });

  const lead = await prisma.lead.create({
    data: {
      workspaceId,
      contactId: contact.id,
      status: "New Lead",
      source: "Website Form",
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    },
  });

  return { contact, lead };
}
