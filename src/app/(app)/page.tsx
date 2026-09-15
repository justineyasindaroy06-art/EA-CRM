import Link from "next/link";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { getDashboardData } from "@/lib/dashboard";
import { getUniversalNextActions } from "@/lib/next-actions";
import { formatDate, formatDateTime } from "@/lib/dates";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        {href && (
          <Link href={href} className="text-xs font-medium text-neutral-500 hover:text-neutral-800">
            View all →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function DashboardPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const [data, nextActions] = await Promise.all([
    getDashboardData(workspaceId),
    getUniversalNextActions(workspaceId),
  ]);

  return (
    <div>
      <PageHeader title="Dashboard" description="What needs to happen today." />

      {/* Needs Attention */}
      <div className="mb-6">
        <Section title={`Needs Attention (${data.needsAttention.length})`}>
          {data.needsAttention.length === 0 ? (
            <EmptyState message="Nothing needs attention right now." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {data.needsAttention.slice(0, 8).map((item, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <Link href={item.href} className="text-neutral-800 hover:underline">
                    {item.what}
                  </Link>
                  {item.who && <span className="text-xs text-neutral-400">{item.who}</span>}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Section title="Today's Tasks" href="/tasks">
          {data.tasksDueToday.length === 0 ? (
            <EmptyState message="You're all caught up." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {data.tasksDueToday.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-neutral-800">{t.taskName}</span>
                  <Badge label={t.priority} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Today's Meetings" href="/calendar">
          {data.meetingsToday.length === 0 ? (
            <EmptyState message="No meetings today." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {data.meetingsToday.map((m) => {
                const who = m.client ? `${m.client.contact.firstName} ${m.client.contact.lastName}` : m.lead ? `${m.lead.contact.firstName} ${m.lead.contact.lastName}` : "—";
                return (
                  <li key={m.id} className="py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-neutral-800">{m.title}</span>
                      <span className="text-xs text-neutral-400">{formatDateTime(m.startAt)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-xs text-neutral-400">
                      <span>{who}</span>
                      {m.googleMeetUrl && (
                        <a href={m.googleMeetUrl} target="_blank" rel="noreferrer" className="text-neutral-600 hover:underline">
                          Join Meet
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Lead Activity" href="/leads">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">New leads</span>
              <span className="font-medium text-neutral-800">{data.newLeads.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Follow-ups due</span>
              <span className="font-medium text-neutral-800">{data.followUpsDue.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Consultations booked</span>
              <span className="font-medium text-neutral-800">{data.consultationsBooked.length}</span>
            </div>
          </div>
        </Section>

        <Section title="Active Clients" href="/clients">
          {data.activeClients.length === 0 ? (
            <EmptyState message="No active clients yet." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {data.activeClients.slice(0, 5).map((c) => (
                <li key={c.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <Link href={`/clients/${c.id}`} className="font-medium text-neutral-800 hover:underline">
                      {c.contact.firstName} {c.contact.lastName}
                    </Link>
                    <span className="text-xs text-neutral-400">{c.clientPackages[0]?.package.name ?? "—"}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-xs text-neutral-400">
                    <span>{c.nextAction ?? "No next action set"}</span>
                    <span>{formatDate(c.nextActionDue)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Content" href="/content">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Awaiting approval</span>
              <span className="font-medium text-neutral-800">{data.contentAwaitingApproval.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Due soon</span>
              <span className="font-medium text-neutral-800">{data.contentDueSoon.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Scheduled</span>
              <span className="font-medium text-neutral-800">{data.contentScheduled.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Overdue</span>
              <span className="font-medium text-neutral-800">{data.contentOverdue.length}</span>
            </div>
          </div>
        </Section>

        <Section title="Billing" href="/billing">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Outstanding amount</span>
              <span className="font-medium text-neutral-800">${data.outstandingAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Invoices due</span>
              <span className="font-medium text-neutral-800">{data.invoicesDueCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Overdue invoices</span>
              <span className="font-medium text-neutral-800">{data.overdueInvoiceCount}</span>
            </div>
          </div>
        </Section>

        <Section title="Time" href="/time">
          {data.activeTimer ? (
            <div className="text-sm">
              <p className="font-medium text-neutral-800">Timer running</p>
              <p className="text-xs text-neutral-400">
                {data.activeTimer.client ? `${data.activeTimer.client.contact.firstName} ${data.activeTimer.client.contact.lastName}` : "No client"} · started {formatDateTime(data.activeTimer.startAt)}
              </p>
            </div>
          ) : (
            <EmptyState message="No timer running." />
          )}
        </Section>
      </div>

      {/* Universal Next Actions */}
      <div className="mt-6">
        <Section title="Universal Next Actions">
          {nextActions.length === 0 ? (
            <EmptyState message="No next actions set yet." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-neutral-400">
                  <th className="pb-2 font-medium">What</th>
                  <th className="pb-2 font-medium">Client / Workspace</th>
                  <th className="pb-2 font-medium">Due</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {nextActions.slice(0, 15).map((item) => (
                  <tr key={`${item.recordType}-${item.id}`}>
                    <td className="py-2">
                      <Link href={item.href} className="text-neutral-800 hover:underline">
                        {item.what}
                      </Link>
                    </td>
                    <td className="py-2 text-neutral-500">{item.workspaceName}</td>
                    <td className="py-2 text-neutral-500">{formatDate(item.dueDate)}</td>
                    <td className="py-2">
                      <Badge label={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </div>
  );
}
