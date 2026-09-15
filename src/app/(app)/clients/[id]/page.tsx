import Link from "next/link";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
import { prisma } from "@/lib/prisma";
import { getActivityForRecord } from "@/lib/activity";
import { invoiceBalance, invoiceEffectiveStatus } from "@/lib/billing";
import { formatDate, formatDateTime } from "@/lib/dates";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { updateClientFieldsAction } from "../actions";

const TABS = ["Overview", "Tasks", "Meetings", "Files", "Billing"];

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "Overview" } = await searchParams;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      contact: true,
      workspace: true,
      tasks: { orderBy: { dueDate: "asc" } },
      meetings: { orderBy: { startAt: "desc" } },
      files: { orderBy: { createdAt: "desc" } },
      invoices: { include: { payments: true }, orderBy: { invoiceDate: "desc" } },
      clientPackages: { include: { package: true } },
    },
  });

  if (!client) notFound();

  const activity = await getActivityForRecord("client", client.id);
  const outstandingBalance = client.invoices.reduce((sum, inv) => sum + invoiceBalance(inv), 0);
  const upcomingMeeting = client.meetings.find((m) => m.status === "Scheduled" && m.startAt > new Date());
  const updateFieldsWithId = updateClientFieldsAction.bind(null, client.id);

  return (
    <div>
      <PageHeader
        title={`${client.contact.firstName} ${client.contact.lastName}`}
        description={`${client.workspace.name} · ${client.clientPackages[0]?.package.name ?? "No package"}`}
        actions={<Badge label={client.status} />}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-sm md:grid-cols-4">
        <div>
          <p className="text-xs text-neutral-400">Start Date</p>
          <p className="text-neutral-800">{formatDate(client.startDate)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">Next Meeting</p>
          <p className="text-neutral-800">{upcomingMeeting ? formatDateTime(upcomingMeeting.startAt) : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">Outstanding Balance</p>
          <p className="text-neutral-800">${outstandingBalance.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">Drive</p>
          {client.driveRootUrl ? (
            <a href={client.driveRootUrl} target="_blank" rel="noreferrer" className="text-neutral-700 hover:underline">
              Open Drive
            </a>
          ) : (
            <p className="text-neutral-400">Not linked</p>
          )}
        </div>
      </div>

      <div className="mb-4 flex gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/clients/${client.id}?tab=${t}`}
            className={clsx(
              "border-b-2 px-3 py-2 text-sm font-medium",
              tab === t ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400 hover:text-neutral-700"
            )}
          >
            {t}
          </Link>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-neutral-900">Quick Info</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-neutral-400">Email</dt>
                  <dd className="text-neutral-800">{client.contact.email}</dd>
                </div>
                <div>
                  <dt className="text-neutral-400">Phone</dt>
                  <dd className="text-neutral-800">{client.contact.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-neutral-400">Company</dt>
                  <dd className="text-neutral-800">{client.contact.company ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-neutral-400">Client Type</dt>
                  <dd className="text-neutral-800">{client.clientType ?? "—"}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-neutral-900">Next Action &amp; Notes</h2>
              <form action={updateFieldsWithId} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-500">Next Action</label>
                    <input name="nextAction" defaultValue={client.nextAction ?? ""} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500">Due Date</label>
                    <input
                      type="date"
                      name="nextActionDue"
                      defaultValue={client.nextActionDue ? client.nextActionDue.toISOString().slice(0, 10) : ""}
                      className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-500">Status</label>
                    <select name="status" defaultValue={client.status} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                      {["active", "paused", "archived"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500">Client Type</label>
                    <input name="clientType" defaultValue={client.clientType ?? ""} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500">Notes</label>
                  <textarea name="notes" defaultValue={client.notes ?? ""} rows={3} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
                </div>
                <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
                  Save
                </button>
              </form>
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-neutral-900">Recent Activity</h2>
              <ActivityTimeline activities={activity} />
            </section>
          </div>
        </div>
      )}

      {tab === "Tasks" && (
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          {client.tasks.length === 0 ? (
            <p className="text-sm text-neutral-400">No tasks yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {client.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-neutral-800">{t.taskName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400">{formatDate(t.dueDate)}</span>
                    <Badge label={t.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "Meetings" && (
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          {client.meetings.length === 0 ? (
            <p className="text-sm text-neutral-400">No meetings yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {client.meetings.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="text-neutral-800">{m.title}</p>
                    <p className="text-xs text-neutral-400">{formatDateTime(m.startAt)}</p>
                  </div>
                  <Badge label={m.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "Files" && (
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          {client.files.length === 0 ? (
            <p className="text-sm text-neutral-400">No files linked yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {client.files.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                  <a href={f.driveUrl} target="_blank" rel="noreferrer" className="text-neutral-800 hover:underline">
                    {f.name}
                  </a>
                  <span className="text-xs text-neutral-400">{f.folderName}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "Billing" && (
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          {client.invoices.length === 0 ? (
            <p className="text-sm text-neutral-400">No invoices yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-neutral-400">
                <tr>
                  <th className="pb-2 font-medium">Invoice</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Balance</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {client.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2 text-neutral-800">{inv.invoiceNumber}</td>
                    <td className="py-2 text-neutral-500">${inv.amount.toFixed(2)}</td>
                    <td className="py-2 text-neutral-500">${invoiceBalance(inv).toFixed(2)}</td>
                    <td className="py-2">
                      <Badge label={invoiceEffectiveStatus(inv)} />
                    </td>
                    <td className="py-2 text-neutral-500">{formatDate(inv.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
