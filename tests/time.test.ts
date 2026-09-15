import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/dates";
import { createWorkspace } from "./fixtures";

describe("Time tracking", () => {
  it("computes duration in seconds when a timer is stopped", async () => {
    const workspace = await createWorkspace();
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + 45 * 60 * 1000); // 45 minutes later

    const entry = await prisma.timeEntry.create({
      data: { workspaceId: workspace.id, startAt, endAt, duration: Math.floor((endAt.getTime() - startAt.getTime()) / 1000) },
    });

    expect(entry.duration).toBe(45 * 60);
    expect(formatDuration(entry.duration)).toBe("45m");
  });

  it("supports manually editing a time entry's duration", async () => {
    const workspace = await createWorkspace();
    const entry = await prisma.timeEntry.create({
      data: { workspaceId: workspace.id, startAt: new Date(), endAt: new Date(), duration: 600 },
    });

    const edited = await prisma.timeEntry.update({ where: { id: entry.id }, data: { duration: 1800 } });
    expect(edited.duration).toBe(1800);
    expect(formatDuration(edited.duration)).toBe("30m");
  });

  it("sums weekly/monthly totals per workspace via aggregate", async () => {
    const workspace = await createWorkspace();
    await prisma.timeEntry.createMany({
      data: [
        { workspaceId: workspace.id, startAt: new Date(), endAt: new Date(), duration: 3600 },
        { workspaceId: workspace.id, startAt: new Date(), endAt: new Date(), duration: 1800 },
      ],
    });

    const total = await prisma.timeEntry.aggregate({
      where: { workspaceId: workspace.id },
      _sum: { duration: true },
    });

    expect(total._sum.duration).toBe(5400);
  });
});
