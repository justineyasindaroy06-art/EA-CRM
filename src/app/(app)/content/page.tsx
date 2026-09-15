import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId, getAllWorkspaces } from "@/lib/workspace";
import { CONTENT_STATUSES } from "@/lib/constants";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ContentRow } from "./ContentRow";
import { NewContentForm } from "./NewContentForm";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; platform?: string; type?: string; highlight?: string }>;
}) {
  const params = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();

  const where: Record<string, unknown> = workspaceId ? { workspaceId } : {};
  if (params.status) where.status = params.status;
  if (params.platform) where.platform = params.platform;
  if (params.type) where.contentType = params.type;

  const [items, workspaces, platforms] = await Promise.all([
    prisma.contentItem.findMany({ where, orderBy: { dueDate: "asc" } }),
    getAllWorkspaces(),
    prisma.contentItem.findMany({
      where: workspaceId ? { workspaceId } : {},
      select: { platform: true },
      distinct: ["platform"],
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Content"
        description="Content production workflow — links to Canva, CapCut, and Drive."
        actions={<NewContentForm workspaces={workspaces} defaultWorkspaceId={workspaceId ?? workspaces[0]?.id} />}
      />

      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <select name="status" defaultValue={params.status ?? ""} className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm">
          <option value="">All statuses</option>
          {CONTENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select name="platform" defaultValue={params.platform ?? ""} className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm">
          <option value="">All platforms</option>
          {platforms.filter((p) => p.platform).map((p) => (
            <option key={p.platform} value={p.platform!}>{p.platform}</option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50">
          Filter
        </button>
        {(params.status || params.platform) && (
          <Link href="/content" className="rounded-md px-3 py-1.5 text-sm text-neutral-500 hover:underline">
            Clear
          </Link>
        )}
      </form>

      {items.length === 0 ? (
        <EmptyState message="No content scheduled yet." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Platform</th>
                <th className="px-4 py-2 font-medium">Due</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.map((item) => (
                <ContentRow
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  contentType={item.contentType}
                  platform={item.platform}
                  status={item.status}
                  dueDate={item.dueDate}
                  canvaUrl={item.canvaUrl}
                  capcutUrl={item.capcutUrl}
                  googleDriveUrl={item.googleDriveUrl}
                  highlighted={params.highlight === item.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
