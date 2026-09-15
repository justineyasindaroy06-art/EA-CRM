import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();

  const where: Record<string, unknown> = workspaceId ? { workspaceId } : {};
  if (params.status) where.status = params.status;

  const clients = await prisma.client.findMany({
    where,
    include: {
      contact: true,
      workspace: true,
      clientPackages: { include: { package: true }, where: { status: "active" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Clients" description="Active and archived client workspaces." />

      <form className="mb-4 flex gap-2" method="get">
        <select name="status" defaultValue={params.status ?? ""} className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm">
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
        <button type="submit" className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50">
          Filter
        </button>
        {params.status && (
          <Link href="/clients" className="rounded-md px-3 py-1.5 text-sm text-neutral-500 hover:underline">
            Clear
          </Link>
        )}
      </form>

      {clients.length === 0 ? (
        <EmptyState message="No active clients yet." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Workspace</th>
                <th className="px-4 py-2 font-medium">Package</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Next Action</th>
                <th className="px-4 py-2 font-medium">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <Link href={`/clients/${c.id}`} className="font-medium text-neutral-800 hover:underline">
                      {c.contact.firstName} {c.contact.lastName}
                    </Link>
                    <div className="text-xs text-neutral-400">{c.contact.email}</div>
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{c.workspace.name}</td>
                  <td className="px-4 py-2 text-neutral-500">{c.clientPackages[0]?.package.name ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Badge label={c.status} />
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{c.nextAction ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-500">{formatDate(c.nextActionDue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
