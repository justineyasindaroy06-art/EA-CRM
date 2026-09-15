import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { LEAD_STATUSES } from "@/lib/constants";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; consultation?: string }>;
}) {
  const params = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();

  const where: Record<string, unknown> = workspaceId ? { workspaceId } : {};
  if (params.status) where.status = params.status;
  if (params.source) where.source = params.source;
  if (params.consultation) where.consultationStatus = params.consultation;

  const leads = await prisma.lead.findMany({
    where,
    include: { contact: true, workspace: true },
    orderBy: { createdAt: "desc" },
  });

  const sources = await prisma.lead.findMany({
    where: workspaceId ? { workspaceId } : {},
    select: { source: true },
    distinct: ["source"],
  });

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Website submissions and manually added leads."
        actions={
          <Link
            href="/leads/new"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            New Lead
          </Link>
        }
      />

      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <select name="status" defaultValue={params.status ?? ""} className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm">
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="source" defaultValue={params.source ?? ""} className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm">
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s.source} value={s.source}>
              {s.source}
            </option>
          ))}
        </select>
        <select name="consultation" defaultValue={params.consultation ?? ""} className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm">
          <option value="">All consultation statuses</option>
          {["Not Scheduled", "Booked", "Completed", "No Show", "Cancelled"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50">
          Filter
        </button>
        {(params.status || params.source || params.consultation) && (
          <Link href="/leads" className="rounded-md px-3 py-1.5 text-sm text-neutral-500 hover:underline">
            Clear
          </Link>
        )}
      </form>

      {leads.length === 0 ? (
        <EmptyState message="No leads yet. New website submissions will appear here." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Workspace</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Next Action</th>
                <th className="px-4 py-2 font-medium">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-neutral-800 hover:underline">
                      {lead.contact.firstName} {lead.contact.lastName}
                    </Link>
                    <div className="text-xs text-neutral-400">{lead.contact.email}</div>
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{lead.workspace.name}</td>
                  <td className="px-4 py-2">
                    <Badge label={lead.status} />
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{lead.source}</td>
                  <td className="px-4 py-2 text-neutral-500">{lead.nextAction ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-500">{formatDate(lead.nextActionDue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
