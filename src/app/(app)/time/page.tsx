import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId, getAllWorkspaces } from "@/lib/workspace";
import { formatDateTime, formatDuration, startOfToday, addDays } from "@/lib/dates";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { TimerWidget } from "./TimerWidget";
import { ManualEntryForm } from "./ManualEntryForm";
import { DeleteEntryButton } from "./DeleteEntryButton";

export default async function TimePage() {
  const workspaceId = await getCurrentWorkspaceId();
  const scope: Record<string, unknown> = workspaceId ? { workspaceId } : {};

  const [activeTimerRaw, workspaces, clients, entries] = await Promise.all([
    prisma.timeEntry.findFirst({
      where: { ...scope, endAt: null },
      include: { client: { include: { contact: true } } },
    }),
    getAllWorkspaces(),
    prisma.client.findMany({ where: scope, include: { contact: true } }),
    prisma.timeEntry.findMany({
      where: scope,
      include: { client: { include: { contact: true } } },
      orderBy: { startAt: "desc" },
      take: 30,
    }),
  ]);

  const today0 = startOfToday();
  const weekStart = addDays(today0, -7);
  const monthStart = addDays(today0, -30);

  const [todayTotal, weekTotal, monthTotal] = await Promise.all([
    prisma.timeEntry.aggregate({ where: { ...scope, startAt: { gte: today0 }, duration: { not: null } }, _sum: { duration: true } }),
    prisma.timeEntry.aggregate({ where: { ...scope, startAt: { gte: weekStart }, duration: { not: null } }, _sum: { duration: true } }),
    prisma.timeEntry.aggregate({ where: { ...scope, startAt: { gte: monthStart }, duration: { not: null } }, _sum: { duration: true } }),
  ]);

  const activeTimer = activeTimerRaw
    ? {
        id: activeTimerRaw.id,
        startAt: activeTimerRaw.startAt.toISOString(),
        clientLabel: activeTimerRaw.client ? `${activeTimerRaw.client.contact.firstName} ${activeTimerRaw.client.contact.lastName}` : null,
        project: activeTimerRaw.project,
      }
    : null;

  return (
    <div>
      <PageHeader title="Time" description="Track billable and non-billable time." />

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TimerWidget
            activeTimer={activeTimer}
            workspaces={workspaces}
            clients={clients.map((c) => ({ id: c.id, workspaceId: c.workspaceId, label: `${c.contact.firstName} ${c.contact.lastName}` }))}
            defaultWorkspaceId={workspaceId ?? workspaces[0]?.id}
          />
        </div>
        <div className="grid grid-cols-3 gap-3 lg:col-span-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
            <p className="text-xs text-neutral-400">Today</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">{formatDuration(todayTotal._sum.duration)}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
            <p className="text-xs text-neutral-400">This Week</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">{formatDuration(weekTotal._sum.duration)}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
            <p className="text-xs text-neutral-400">This Month</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">{formatDuration(monthTotal._sum.duration)}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <ManualEntryForm
          workspaces={workspaces}
          clients={clients.map((c) => ({ id: c.id, workspaceId: c.workspaceId, label: `${c.contact.firstName} ${c.contact.lastName}` }))}
          defaultWorkspaceId={workspaceId ?? workspaces[0]?.id}
        />
      </div>

      {entries.length === 0 ? (
        <EmptyState message="No time entries yet." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Client</th>
                <th className="px-4 py-2 font-medium">Project</th>
                <th className="px-4 py-2 font-medium">Start</th>
                <th className="px-4 py-2 font-medium">Duration</th>
                <th className="px-4 py-2 font-medium">Billable</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2 text-neutral-800">{e.client ? `${e.client.contact.firstName} ${e.client.contact.lastName}` : "—"}</td>
                  <td className="px-4 py-2 text-neutral-500">{e.project ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-500">{formatDateTime(e.startAt)}</td>
                  <td className="px-4 py-2 text-neutral-500">{e.endAt ? formatDuration(e.duration) : "In progress"}</td>
                  <td className="px-4 py-2 text-neutral-500">{e.billable ? "Yes" : "No"}</td>
                  <td className="px-4 py-2 text-right">
                    <DeleteEntryButton entryId={e.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
