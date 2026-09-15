import Link from "next/link";
import { clsx } from "clsx";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId, getAllWorkspaces } from "@/lib/workspace";
import { invoiceBalance, invoiceEffectiveStatus } from "@/lib/billing";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ActionButton } from "@/components/ActionButton";
import { NewInvoiceForm } from "./NewInvoiceForm";
import { RecordPaymentForm } from "./RecordPaymentForm";
import { NewPackageForm } from "./NewPackageForm";
import { markInvoiceSentAction } from "./actions";

const TABS = ["Invoices", "Payments", "Packages"];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; client?: string; highlight?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab ?? "Invoices";
  const workspaceId = await getCurrentWorkspaceId();
  const scope: Record<string, unknown> = workspaceId ? { workspaceId } : {};

  const invoiceWhere: Record<string, unknown> = { ...scope };
  if (params.status) invoiceWhere.status = params.status;
  if (params.client) invoiceWhere.clientId = params.client;

  const [invoices, payments, packages, clients, workspaces] = await Promise.all([
    prisma.invoice.findMany({
      where: invoiceWhere,
      include: { client: { include: { contact: true } }, payments: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.payment.findMany({
      where: scope,
      include: { client: { include: { contact: true } }, invoice: true },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.package.findMany({ where: scope, orderBy: { name: "asc" } }),
    prisma.client.findMany({ where: scope, include: { contact: true } }),
    getAllWorkspaces(),
  ]);

  const openInvoices = await prisma.invoice.findMany({
    where: { ...scope, status: { notIn: ["Paid", "Cancelled"] } },
    include: { client: { include: { contact: true } } },
  });

  return (
    <div>
      <PageHeader title="Billing" description="Packages, invoices, and payments." />

      <div className="mb-4 flex gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/billing?tab=${t}`}
            className={clsx(
              "border-b-2 px-3 py-2 text-sm font-medium",
              tab === t ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400 hover:text-neutral-700"
            )}
          >
            {t}
          </Link>
        ))}
      </div>

      {tab === "Invoices" && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <form className="flex gap-2" method="get">
              <input type="hidden" name="tab" value="Invoices" />
              <select name="status" defaultValue={params.status ?? ""} className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm">
                <option value="">All statuses</option>
                {["Draft", "Sent", "Paid", "Partially Paid", "Overdue", "Cancelled"].map((s) => (
                  <option key={s} value={s}>{s}</option>
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
            <NewInvoiceForm
              clients={clients.map((c) => ({ id: c.id, label: `${c.contact.firstName} ${c.contact.lastName}` }))}
              packages={packages.map((p) => ({ id: p.id, clientLabel: "", name: p.name }))}
            />
          </div>

          {invoices.length === 0 ? (
            <EmptyState message="No invoices yet." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Invoice</th>
                    <th className="px-4 py-2 font-medium">Client</th>
                    <th className="px-4 py-2 font-medium">Amount</th>
                    <th className="px-4 py-2 font-medium">Balance</th>
                    <th className="px-4 py-2 font-medium">Due</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className={params.highlight === inv.id ? "bg-amber-50" : "hover:bg-neutral-50"}>
                      <td className="px-4 py-2 text-neutral-800">{inv.invoiceNumber}</td>
                      <td className="px-4 py-2 text-neutral-500">{inv.client.contact.firstName} {inv.client.contact.lastName}</td>
                      <td className="px-4 py-2 text-neutral-500">${inv.amount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-neutral-500">${invoiceBalance(inv).toFixed(2)}</td>
                      <td className="px-4 py-2 text-neutral-500">{formatDate(inv.dueDate)}</td>
                      <td className="px-4 py-2">
                        <Badge label={invoiceEffectiveStatus(inv)} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        {inv.status === "Draft" && (
                          <ActionButton action={markInvoiceSentAction.bind(null, inv.id)} className="text-xs">
                            Mark Sent
                          </ActionButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "Payments" && (
        <div>
          <div className="mb-4 flex justify-end">
            <RecordPaymentForm
              clients={clients.map((c) => ({ id: c.id, label: `${c.contact.firstName} ${c.contact.lastName}` }))}
              invoices={openInvoices.map((i) => ({ id: i.id, clientId: i.clientId, label: `${i.invoiceNumber} — ${i.client.contact.firstName} ${i.client.contact.lastName}` }))}
            />
          </div>
          {payments.length === 0 ? (
            <EmptyState message="No payments recorded yet." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Client</th>
                    <th className="px-4 py-2 font-medium">Invoice</th>
                    <th className="px-4 py-2 font-medium">Amount</th>
                    <th className="px-4 py-2 font-medium">Method</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-2 text-neutral-800">{p.client.contact.firstName} {p.client.contact.lastName}</td>
                      <td className="px-4 py-2 text-neutral-500">{p.invoice?.invoiceNumber ?? "—"}</td>
                      <td className="px-4 py-2 text-neutral-500">${p.amount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-neutral-500">{p.paymentMethod ?? "—"}</td>
                      <td className="px-4 py-2 text-neutral-500">{formatDate(p.paymentDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "Packages" && (
        <div>
          <div className="mb-4 flex justify-end">
            <NewPackageForm workspaces={workspaces} defaultWorkspaceId={workspaceId ?? workspaces[0]?.id} />
          </div>
          {packages.length === 0 ? (
            <EmptyState message="No packages yet." />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {packages.map((p) => (
                <div key={p.id} className="rounded-lg border border-neutral-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-900">{p.name}</h3>
                    <span className="text-sm text-neutral-500">${p.price.toFixed(2)}</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">{p.duration ?? "—"} · {p.packageType ?? "—"}</p>
                  {p.description && <p className="mt-2 text-sm text-neutral-600">{p.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
