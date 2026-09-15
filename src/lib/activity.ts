import { prisma } from "./prisma";

/**
 * Appends a read-only activity record. Called from server actions whenever
 * an important state change happens (spec section 23, 38) — never edited
 * from the UI directly.
 */
export async function logActivity(params: {
  workspaceId: string;
  recordType: string;
  recordId: string;
  eventType: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.activity.create({
    data: {
      workspaceId: params.workspaceId,
      recordType: params.recordType,
      recordId: params.recordId,
      eventType: params.eventType,
      summary: params.summary,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });
}

export async function getActivityForRecord(recordType: string, recordId: string) {
  return prisma.activity.findMany({
    where: { recordType, recordId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecentActivity(workspaceId: string | null, limit = 20) {
  return prisma.activity.findMany({
    where: workspaceId ? { workspaceId } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
