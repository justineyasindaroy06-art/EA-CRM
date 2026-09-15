import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { ActionButton } from "@/components/ActionButton";
import { isTestMode } from "@/lib/integrations/types";
import { getIntegrationStatuses, type ConnectionStatus } from "@/lib/integrations/google-oauth";
import { SCHEDULER_AUTOMATION_NAME } from "@/lib/automations/scheduler";
import { formatDateTime } from "@/lib/dates";
import { EmailTemplateCard } from "./EmailTemplateCard";
import { NewWorkspaceForm } from "./NewWorkspaceForm";
import {
  updateAutomationSettingsAction,
  disconnectGoogleAction,
  runSchedulerNowAction,
} from "./actions";

async function getSettingNumber(key: string, fallback: number) {
  const s = await prisma.setting.findUnique({ where: { key } });
  return s ? Number(JSON.parse(s.value)) : fallback;
}

function statusLabel(status: ConnectionStatus, kind: "calendar_drive" | "gmail"): string {
  if (status === "mock") return kind === "gmail" ? "Test Mode" : "Mock";
  if (status === "connected") return "Connected";
  if (status === "disconnected") return "Disconnected";
  return "Error";
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google_connected?: string; google_error?: string }>;
}) {
  const params = await searchParams;

  const [workspaces, templates, followUpDays, finalDays, integrationStatuses, schedulerRuns] = await Promise.all([
    prisma.workspace.findMany({ orderBy: { name: "asc" } }),
    prisma.emailTemplate.findMany({ orderBy: { name: "asc" } }),
    getSettingNumber("automation_followup_days", 4),
    getSettingNumber("automation_final_days", 10),
    getIntegrationStatuses(),
    prisma.automationRun.findMany({
      where: { automationName: SCHEDULER_AUTOMATION_NAME },
      orderBy: { runAt: "desc" },
      take: 20,
    }),
  ]);

  const lastRun = schedulerRuns[0] ?? null;
  const lastSuccess = schedulerRuns.find((r) => r.status === "success") ?? null;
  const lastFailure = schedulerRuns.find((r) => r.status === "error") ?? null;
  const schedulerConfigured = Boolean(process.env.CRON_SECRET);

  const googleConnected = integrationStatuses.calendar === "connected";

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Settings" description="Workspaces, automations, integrations, and templates." />

      {params.google_connected && (
        <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Google account connected successfully.
        </div>
      )}
      {params.google_error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{params.google_error}</div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Workspace Settings</h2>
        <NewWorkspaceForm />
        <div className="space-y-2">
          {workspaces.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3">
              <div>
                <p className="text-sm font-medium text-neutral-800">{w.name}</p>
                <p className="text-xs text-neutral-400">{w.description ?? "No description"}</p>
              </div>
              <Badge label={w.status} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Automation Settings</h2>
        <form action={updateAutomationSettingsAction} className="grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-white p-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500">Follow-up after (days)</label>
            <input type="number" name="followUpDays" defaultValue={followUpDays} min={1} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500">Final follow-up / nurture after (days)</label>
            <input type="number" name="finalDays" defaultValue={finalDays} min={1} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div className="col-span-2">
            <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
              Save Timing
            </button>
          </div>
        </form>

        <p className="mt-3 text-xs text-neutral-400">
          Test mode is {isTestMode() ? "ON" : "OFF"} (set AUTOMATIONS_TEST_MODE in .env). While on, automations run without sending real emails or creating real calendar/Drive resources.
        </p>

        <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">Email Templates</h3>
        <div className="space-y-2">
          {templates.map((t) => (
            <EmailTemplateCard key={t.id} template={t} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Lead Follow-up Scheduler</h2>
        <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-700">Scheduler</span>
            <Badge label={schedulerConfigured ? "Configured" : "Not Configured"} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-700">Last Run</span>
            <span className="text-neutral-500">{lastRun ? formatDateTime(lastRun.runAt) : "Never"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-700">Last Successful Run</span>
            <span className="text-neutral-500">{lastSuccess ? formatDateTime(lastSuccess.runAt) : "Never"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-700">Last Failure</span>
            <span className="text-neutral-500">{lastFailure ? formatDateTime(lastFailure.runAt) : "None"}</span>
          </div>
          {lastRun?.error && (
            <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">{lastRun.error}</p>
          )}
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          {schedulerConfigured
            ? "CRON_SECRET is set. Point your scheduler (Vercel Cron, GitHub Actions, etc. — see README) at GET /api/cron/lead-followups with header Authorization: Bearer <CRON_SECRET>."
            : "Set CRON_SECRET in .env and configure a scheduler to call /api/cron/lead-followups on a recurring basis — see README \"Deploying the scheduler\". Until then, follow-ups only run when you trigger them manually below or via the lead's own \"Run automation check\" button."}
        </p>
        <div className="mt-2">
          <ActionButton action={runSchedulerNowAction}>Run Scheduler Now</ActionButton>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Integration Settings</h2>
        <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-700">Google Calendar</span>
            <Badge label={statusLabel(integrationStatuses.calendar, "calendar_drive")} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-700">Google Drive</span>
            <Badge label={statusLabel(integrationStatuses.drive, "calendar_drive")} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-700">Gmail</span>
            <Badge label={statusLabel(integrationStatuses.gmail, "gmail")} />
          </div>
          {integrationStatuses.lastError && (
            <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-800">{integrationStatuses.lastError}</p>
          )}
          <div className="flex gap-2 pt-1">
            {googleConnected ? (
              <ActionButton action={disconnectGoogleAction} confirmMessage="Disconnect Google? Calendar, Drive, and Gmail will fall back to mock mode.">
                Disconnect Google
              </ActionButton>
            ) : (
              <a
                href="/api/integrations/google/authorize"
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Connect Google
              </a>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          Connect these by setting GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI (and GMAIL_SENDER_ADDRESS for Gmail) in your .env file, then click Connect Google above and finish the consent screen. See README for the full Google Cloud setup steps. Until connected (or while AUTOMATIONS_TEST_MODE=true), the app uses mock events, folders, and email sends so the rest of the CRM stays fully usable.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Billing Settings</h2>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
          <p>Default currency: USD</p>
          <p>Invoice numbering: manual (enter invoice numbers when creating invoices)</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Time Settings</h2>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
          <p>Default billable behavior: Billable (checked by default when starting a timer or manual entry)</p>
        </div>
      </section>
    </div>
  );
}
