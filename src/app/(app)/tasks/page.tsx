import Link from "next/link";
import { clsx } from "clsx";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId, getAllWorkspaces } from "@/lib/workspace";
import { startOfToday, endOfToday } from "@/lib/dates";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { TaskRow } from "./TaskRow";
import { NewTaskForm } from "./NewTaskForm";

const VIEWS = ["Today", "Upcoming", "Overdue", "Completed", "All"];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; status?: string; priority?: string; client?: string; highlight?: string }>;
}) {
  const params = await searchParams;
  const view = params.view ?? "Today";
  const workspaceId = await getCurrentWorkspaceId();
  const scope: Record<string, unknown> = workspaceId ? { workspaceId } : {};

  const today0 = startOfToday();
  const today1 = endOfToday();

  const where: Record<string, unknown> = { ...scope };

  if (view === "Today") {
    where.status = { not: "Done" };
    where.dueDate = { gte: today0, lte: today1 };
  } else if (view === "Upcoming") {
    where.status = { not: "Done" };
    where.dueDate = { gt: today1 };
  } else if (view === "Overdue") {
    where.status = { not: "Done" };
    where.dueDate = { lt: today0 };
  } else if (view === "Completed") {
    where.status = "Done";
  }

  if (params.status) where.status = params.status;
  if (params.priority) where.priority = params.priority;
  if (params.client) where.relatedClientId = params.client;

  const [tasks, workspaces, clients] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        client: { include: { contact: true } },
        lead: { include: { contact: true } },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
    }),
    getAllWorkspaces(),
    prisma.client.findMany({ where: scope, include: { contact: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="What you need to do, organized by when."
        actions={<NewTaskForm workspaces={workspaces} defaultWorkspaceId={workspaceId ?? workspaces[0]?.id} />}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-md border border-neutral-200 bg-white p-1">
          {VIEWS.map((v) => (
            <Link
              key={v}
              href={`/tasks?view=${v}`}
              className={clsx(
                "rounded px-3 py-1.5 text-sm font-medium",
                view === v ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
              )}
            >
              {v}
            </Link>
          ))}
        </div>

        <form className="flex gap-2" method="get">
          <input type="hidden" name="view" value={view} />
          <select name="priority" defaultValue={params.priority ?? ""} className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm">
            <option value="">All priorities</option>
            {["Low", "Medium", "High", "Urgent"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select name="client" defaultValue={params.client ?? ""} className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm">
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.contact.firstName} {c.contact.lastName}</option>
            ))}
          </select>
          <button type="submit" className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50">
            Filter
          </button>
        </form>
      </div>

      {tasks.length === 0 ? (
        <EmptyState message="You're all caught up." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Task</th>
                <th className="px-4 py-2 font-medium">Related</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Priority</th>
                <th className="px-4 py-2 font-medium">Due</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  id={t.id}
                  taskName={t.taskName}
                  status={t.status}
                  priority={t.priority}
                  category={t.category}
                  dueDate={t.dueDate}
                  waitingOn={t.waitingOn}
                  relatedLabel={
                    t.client ? `${t.client.contact.firstName} ${t.client.contact.lastName}` :
                    t.lead ? `${t.lead.contact.firstName} ${t.lead.contact.lastName}` : null
                  }
                  highlighted={params.highlight === t.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
