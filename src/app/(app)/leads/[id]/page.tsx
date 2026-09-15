import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActivityForRecord } from "@/lib/activity";
import { getConversionReadiness } from "@/lib/automations/conversion";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { ActionButton } from "@/components/ActionButton";
import { ConfirmCheckbox } from "@/components/ConfirmCheckbox";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { StatusSelect } from "./StatusSelect";
import { LEAD_STATUSES } from "@/lib/constants";
import {
  updateLeadStatusAction,
  updateLeadFieldsAction,
  confirmEaConversionAction,
  convertLeadAction,
  runAutomationCheckAction,
} from "../actions";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { contact: true, workspace: true, tasks: true, meetings: true },
  });

  if (!lead) notFound();

  const [activity] = await Promise.all([getActivityForRecord("lead", lead.id)]);

  const readiness = getConversionReadiness(lead);
  const updateFieldsWithId = updateLeadFieldsAction.bind(null, lead.id);
  const confirmWithId = confirmEaConversionAction.bind(null, lead.id);
  const convertWithId = convertLeadAction.bind(null, lead.id);
  const runAutomationWithId = runAutomationCheckAction.bind(null, lead.id);

  return (
    <div>
      <PageHeader
        title={`${lead.contact.firstName} ${lead.contact.lastName}`}
        description={`${lead.workspace.name} · ${lead.contact.email}`}
        actions={
          <>
            <StatusSelect leadId={lead.id} status={lead.status} statuses={LEAD_STATUSES} action={updateLeadStatusAction} />
            <ActionButton action={runAutomationWithId}>Run automation check</ActionButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">Lead Details</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-neutral-400">Phone</dt>
                <dd className="text-neutral-800">{lead.contact.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-400">Company</dt>
                <dd className="text-neutral-800">{lead.contact.company ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-400">Source</dt>
                <dd className="text-neutral-800">{lead.source}</dd>
              </div>
              <div>
                <dt className="text-neutral-400">Interested in</dt>
                <dd className="text-neutral-800">{lead.serviceOrProgram ?? lead.interestedIn ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-400">Biggest challenge</dt>
                <dd className="text-neutral-800">{lead.biggestChallenge ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-400">Desired result</dt>
                <dd className="text-neutral-800">{lead.desiredResult ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-400">Budget range</dt>
                <dd className="text-neutral-800">{lead.budgetRange ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-400">Last contacted</dt>
                <dd className="text-neutral-800">{formatDate(lead.lastContactedAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">Next Action &amp; Notes</h2>
            <form action={updateFieldsWithId} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-500">Next Action</label>
                  <input
                    name="nextAction"
                    defaultValue={lead.nextAction ?? ""}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500">Due Date</label>
                  <input
                    type="date"
                    name="nextActionDue"
                    defaultValue={lead.nextActionDue ? lead.nextActionDue.toISOString().slice(0, 10) : ""}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-500">Consultation</label>
                  <select name="consultationStatus" defaultValue={lead.consultationStatus} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                    {["Not Scheduled", "Booked", "Completed", "No Show", "Cancelled"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500">Agreement</label>
                  <select name="agreementStatus" defaultValue={lead.agreementStatus} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                    {["Not Sent", "Sent", "Signed"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500">Payment</label>
                  <select name="paymentStatus" defaultValue={lead.paymentStatus} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                    {["Unpaid", "Pending", "Paid"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500">Notes</label>
                <textarea name="notes" defaultValue={lead.notes ?? ""} rows={3} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
              </div>

              <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
                Save
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">Activity</h2>
            <ActivityTimeline activities={activity} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">Conversion Readiness</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-neutral-600">Consultation completed</span>
                <span>{readiness.consultationCompleted ? "✅" : "⬜"}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-neutral-600">Agreement signed</span>
                <span>{readiness.agreementSigned ? "✅" : "⬜"}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-neutral-600">Payment received</span>
                <span>{readiness.paymentReceived ? "✅" : "⬜"}</span>
              </li>
              <li className="flex items-center justify-between">
                <ConfirmCheckbox checked={lead.eaConfirmedConversion} label="EA confirmation" action={confirmWithId} />
              </li>
            </ul>

            <div className="mt-4">
              {lead.convertedToClientId ? (
                <Badge label="Already converted" />
              ) : (
                <ActionButton
                  action={convertWithId}
                  variant="primary"
                  className="w-full"
                  confirmMessage="Convert this lead to a client? This will create the client record and onboarding tasks."
                >
                  Convert to Client
                </ActionButton>
              )}
              {!readiness.eaConfirmed && !lead.convertedToClientId && (
                <p className="mt-2 text-xs text-neutral-400">
                  EA confirmation is required before converting, regardless of other signals.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">Related Tasks ({lead.tasks.length})</h2>
            {lead.tasks.length === 0 ? (
              <p className="text-sm text-neutral-400">No tasks yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lead.tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between">
                    <span className="text-neutral-700">{t.taskName}</span>
                    <Badge label={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
