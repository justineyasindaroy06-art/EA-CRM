import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { workspaceScope } from "@/lib/workspace";
import { createWorkspace, createLeadWithContact } from "./fixtures";

describe("Workspace isolation", () => {
  it("a workspace-scoped query never returns another workspace's records", async () => {
    const workspaceA = await createWorkspace("Workspace A");
    const workspaceB = await createWorkspace("Workspace B");

    await createLeadWithContact(workspaceA.id, { email: "a@example.com" });
    await createLeadWithContact(workspaceB.id, { email: "b@example.com" });

    const leadsInA = await prisma.lead.findMany({ where: workspaceScope(workspaceA.id) });
    expect(leadsInA).toHaveLength(1);
    expect(leadsInA[0].workspaceId).toBe(workspaceA.id);

    const leadsInB = await prisma.lead.findMany({ where: workspaceScope(workspaceB.id) });
    expect(leadsInB).toHaveLength(1);
    expect(leadsInB[0].workspaceId).toBe(workspaceB.id);
  });

  it("'All Clients' (null workspace) sees records across every workspace", async () => {
    const workspaceA = await createWorkspace("Workspace A");
    const workspaceB = await createWorkspace("Workspace B");

    await createLeadWithContact(workspaceA.id, { email: "a@example.com" });
    await createLeadWithContact(workspaceB.id, { email: "b@example.com" });

    const allLeads = await prisma.lead.findMany({ where: workspaceScope(null) });
    expect(allLeads).toHaveLength(2);
  });

  it("fetching a record by id scoped to the wrong workspace returns nothing (unauthorized access blocked)", async () => {
    const workspaceA = await createWorkspace("Workspace A");
    const workspaceB = await createWorkspace("Workspace B");
    const { lead } = await createLeadWithContact(workspaceA.id);

    const result = await prisma.lead.findFirst({
      where: { id: lead.id, ...workspaceScope(workspaceB.id) },
    });

    expect(result).toBeNull();
  });
});
